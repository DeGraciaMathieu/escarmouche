import {
  DICE_FACES, COMBAT_PACE, CANCEL_POP, DAMAGE_STEP, DAMAGE_SETTLE,
  ENDSHOT_WAIT_DMG, ENDSHOT_WAIT_NODMG,
  FX_IMPACT_MS, FX_SHIELD_MS, FX_FLOAT_DMG_MS, FX_FLOAT_DOWN_MS,
  FLOAT_DMG_SIZE, FLOAT_SMALL_SIZE, IMPACT_JITTER, IMPACT_SEED_RANGE,
  SHAKE_HIT, SHAKE_CRIT, SHAKE_WOUND, TARGET_FLASH,
} from '../config.js';
import { state } from '../state/game.js';
import { createMelee, meleeOptions, applyMeleeAction } from '../rules/combat.js';
import { sfx } from '../audio.js';
import { addFx } from '../render/fx.js';
import { refresh, journal } from '../render/ui.js';
import { checkEnd, afterAction, endActivation } from './turn.js';

const sleep = ms => new Promise(r => setTimeout(r, ms * COMBAT_PACE));
const roll = n => Array.from({ length: n }, () => 1 + Math.floor(state.rng() * DICE_FACES));

// Attente d'un choix du joueur actif : résolue par le clic sur un bouton d'action.
let resolveChoice = null;
const waitChoice = () => new Promise(r => { resolveChoice = r; });
function chooseAction(action) { const r = resolveChoice; resolveChoice = null; if (r) r(action); }

// Modèle correspondant à un camp du duel ('atk' | 'def').
const modelOf = side => side === 'atk' ? state.duel.atk : state.duel.def;

function brief(atk, def) {
  const line = (m, extra) => `<div class="col">${m === atk ? 'Attaquant' : 'Défenseur'}<br>` +
    `<b>${m.meleeWeapon.a} dés, touche ${m.meleeWeapon.ws}+</b><br>` +
    `${m.meleeWeapon.name} · ${m.meleeWeapon.dn}/${m.meleeWeapon.dc} dégâts${extra}</div>`;
  return line(atk, '') + line(def, ' · riposte gratuite');
}

// Ouvre la modale de duel sur l'écran de briefing (dés pas encore lancés).
export function declareFight(atk, def, s) {
  state.duel = { atk, def, s };
  state.busy = true; state.hoverModel = null;
  document.getElementById('duAtk').textContent = atk.name;
  document.getElementById('duDef').textContent = def.name;
  document.getElementById('duMeta').textContent = `${s.len.toFixed(1)}″ · corps à corps`;
  document.getElementById('duBrief').innerHTML = brief(atk, def);
  document.getElementById('duCta').style.display = 'flex';
  document.getElementById('duArena').style.display = 'none';
  document.getElementById('duVerdict').textContent = '';
  document.getElementById('duel').classList.add('show');
  refresh();
}

export function cancelFight() {
  state.duel = null; state.busy = false;
  document.getElementById('duel').classList.remove('show');
  refresh();
}

function poolLabel(opt, me) {
  if (opt.kind === 'strike')
    return opt.die === 'crit' ? `Frapper — critique (−${me.dc})` : `Frapper — touche (−${me.dn})`;
  const withDie = opt.die === 'crit' ? 'dé critique' : 'dé de touche';
  const tgt = opt.target === 'crit' ? 'une critique' : 'une touche';
  return `Contrer ${tgt} (${withDie})`;
}

function renderPool(id, side, duel) {
  const el = document.getElementById(id), m = modelOf(side), s = duel[side];
  el.classList.toggle('turn', duel.turn === side && !duel.done);
  el.innerHTML = `<div class="du-name">${m.name}</div>` +
    `<div class="du-hp">${s.hp}/${m.w} PV · ${m.meleeWeapon.name}</div>` +
    `<div class="du-dice">${'<span class="mdie crit">✦</span>'.repeat(s.crits)}${'<span class="mdie">•</span>'.repeat(s.hits)}</div>`;
}

function renderArena(duel) {
  renderPool('duPoolAtk', 'atk', duel);
  renderPool('duPoolDef', 'def', duel);
  const turn = document.getElementById('duTurn'), actions = document.getElementById('duActions');
  actions.innerHTML = '';
  if (duel.done) { turn.innerHTML = ''; return; }
  const me = duel[duel.turn];
  turn.innerHTML = `À <em>${modelOf(duel.turn).name}</em> — résous un dé de réussite.`;
  for (const opt of meleeOptions(duel)) {
    const b = document.createElement('button');
    b.className = opt.kind === 'strike' ? 'strike' : 'parry';
    b.textContent = poolLabel(opt, me);
    b.onclick = () => chooseAction(opt);
    actions.appendChild(b);
  }
}

// Applique sur le plateau l'effet d'une action déjà résolue par la règle (dégâts / parade).
function playStep(action, before, after) {
  if (action.kind === 'parry') {
    const parrier = modelOf(before.turn);
    addFx({ type: 'shield', x: parrier.x, y: parrier.y, dur: FX_SHIELD_MS });
    sfx.cancel();
    return;
  }
  const struckSide = before.turn === 'atk' ? 'def' : 'atk';
  const victim = modelOf(struckSide), crit = action.die === 'crit';
  const dmg = before[struckSide].hp - after[struckSide].hp;
  victim.hp = after[struckSide].hp;
  addFx({ type: 'impact', x: victim.x + (Math.random() - .5) * IMPACT_JITTER,
    y: victim.y + (Math.random() - .5) * IMPACT_JITTER, dur: FX_IMPACT_MS, seed: Math.random() * IMPACT_SEED_RANGE });
  addFx({ type: 'float', x: victim.x, y: victim.y, text: '−' + dmg, color: '#ffb27a', dur: FX_FLOAT_DMG_MS, size: FLOAT_DMG_SIZE });
  victim.flash = TARGET_FLASH; state.shake = crit ? SHAKE_CRIT : SHAKE_HIT;
  sfx.wound();
  journal(`<b>${modelOf(before.turn).name}</b> frappe <b>${victim.name}</b> : ${dmg} dégâts${crit ? ' (critique)' : ''}.`);
  if (after.dead === struckSide) { victim.alive = false; sfx.down(); }
}

// Lance les dés des deux camps, joue le duel interactif, applique le dénouement.
export async function fight() {
  if (!state.duel) return;
  const { atk, def } = state.duel;
  document.getElementById('duCta').style.display = 'none';
  document.getElementById('duArena').style.display = 'block';
  document.getElementById('duVerdict').textContent = '';
  sfx.throwDice();

  let duel = createMelee({
    atkRolls: roll(atk.meleeWeapon.a), defRolls: roll(def.meleeWeapon.a),
    atkWeapon: atk.meleeWeapon, defWeapon: def.meleeWeapon, atkHp: atk.hp, defHp: def.hp,
  });
  renderArena(duel);
  await sleep(DAMAGE_SETTLE);

  while (!duel.done) {
    const action = await waitChoice();
    const before = duel;
    duel = applyMeleeAction(before, action);
    playStep(action, before, duel);
    refresh();
    renderArena(duel);
    await sleep(action.kind === 'strike' ? DAMAGE_STEP : CANCEL_POP);
  }

  await endFight(duel);
}

async function endFight(duel) {
  const { atk, def } = state.duel;
  const dead = duel.dead ? modelOf(duel.dead) : null;
  document.getElementById('duVerdict').innerHTML = dead
    ? `<em>${dead.name}</em> est mis hors de combat.`
    : (atk.hp + def.hp < atk.w + def.w ? 'Les lames s\'écartent.' : 'Aucun ne cède.');
  if (dead) {
    state.shake = SHAKE_WOUND;
    addFx({ type: 'float', x: dead.x, y: dead.y, text: 'hors de combat', color: '#e6e1d3', dur: FX_FLOAT_DOWN_MS, size: FLOAT_SMALL_SIZE });
    journal(`<b>${dead.name}</b> tombe au corps à corps.`);
  }
  // seul l'attaquant dépense un point d'action et consomme son attaque du tour
  atk.ap--; atk.shot = true; atk.activated = true; state.undoState = null;
  refresh();
  await sleep(dead ? ENDSHOT_WAIT_DMG : ENDSHOT_WAIT_NODMG);
  document.getElementById('duel').classList.remove('show');
  state.duel = null; state.busy = false;
  if (checkEnd()) return;
  if (!atk.alive) endActivation(); else afterAction(atk);
  refresh();
}

document.getElementById('btnFight').onclick = ev => { ev.stopPropagation(); fight(); };
document.getElementById('btnCancelFight').onclick = ev => { ev.stopPropagation(); cancelFight(); };
