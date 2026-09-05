import {
  DEFENSE_DICE, DIE_ROW, DIE_START_X, DIE_GAP, DIE_SPIN_INTERVAL, SPEED_FAST,
  ENDSHOT_WAIT_DMG, ENDSHOT_WAIT_NODMG, DICE_FACES,
  DIE_REVEAL_STEP, ATTACK_SETTLE, ATTACK_NOTE_HOLD, DEFENSE_INTRO, COVER_DIE_DELAY,
  DEFENSE_NOTE_HOLD, CANCEL_ALIGN, CANCEL_POP, DAMAGE_STEP, DAMAGE_SETTLE, DOWN_DELAY,
  SPIN_HOLD, DIE_DROP_STEP, DROP_SETTLE, DIE_LAND_HOLD,
  FX_MUZZLE_MS, FX_TRACER_MS, TRACER_STAGGER, FX_SHIELD_MS, FX_IMPACT_MS,
  FX_FLOAT_DMG_MS, FX_FLOAT_DOWN_MS, FX_FLOAT_SAVE_MS, FLOAT_DMG_SIZE, FLOAT_SMALL_SIZE,
  IMPACT_JITTER, IMPACT_SEED_RANGE, SHAKE_HIT, SHAKE_CRIT, SHAKE_WOUND, TARGET_FLASH,
  TONE_CRIT_HZ, TONE_HIT_HZ,
  DIE_MISS_DROP, DIE_MISS_ROT, DIE_MISS_SCALE, DIE_MISS_OPACITY, COVER_DIE_OFFSET, COVER_DIE_ROT,
  DIE_ENTER_LEFT, DIE_ENTER_RIGHT, DIE_ENTER_JITTER_Y, DIE_ENTER_ROT, DIE_ENTER_SCALE, DIE_REST_ROT,
} from '../config.js';
import { state, WEAPONS, ROLE_LOADOUTS } from '../state/game.js';
import { isCrit, isHit, isSave, effectiveBs, resolveShot } from '../rules/combat.js';
import { weaponsForRole } from '../rules/loadout.js';
import { weaponCanFire } from '../rules/sight.js';
import { sfx, audio, tone } from '../audio.js';
import { addFx } from '../render/fx.js';
import { refresh, journal } from '../render/ui.js';
import { checkEnd, afterAction } from './turn.js';

const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const field = document.getElementById('field');
const sleep = ms => new Promise(r => setTimeout(r, ms * state.speed));
const ROW = DIE_ROW;
const DX = DIE_START_X, GAP = DIE_GAP;

function makeDie() {
  const d = document.createElement('div'); d.className = 'die'; field.appendChild(d); return d;
}
function paintDie(el, v) {
  el.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const c = document.createElement('span');
    if (PIPS[v].includes(i)) c.appendChild(document.createElement('i'));
    el.appendChild(c);
  }
}
function place(el, x, y, rot = 0, scale = 1) {
  el.style.transform = `translate(${x}px,${y}px) rotate(${rot}deg) scale(${scale})`;
}

// Redessine les parties de la modale qui dépendent de l'arme équipée : méta, briefing,
// sélecteur d'armes (verdict de portée par arme) et disponibilité du bouton de tir.
function shotBrief() {
  const { shooter, target, s } = state.pending;
  const bs = effectiveBs(shooter.weapon.bs, shooter.aimed);
  document.getElementById('cbMeta').textContent =
    `${s.len.toFixed(1)}″ · ${s.cover ? 'cible à couvert' : 'cible à découvert'}${shooter.aimed ? ' · en joue' : ''}`;
  document.getElementById('cbBrief').innerHTML = `
    <div class="col">Attaque<br><b>${shooter.weapon.a} dés, touche ${bs}+</b><br>${shooter.weapon.name}</div>
    <div class="col">Défense<br><b>${DEFENSE_DICE} dés, sauvegarde ${target.sv}+</b><br>${s.cover ? '+ 1 dé de couvert offert' : 'aucun couvert'}</div>
    <div class="col">Dégâts<br><b>${shooter.weapon.dn} par touche, ${shooter.weapon.dc} si critique</b><br>${target.name} a ${target.hp} PV</div>`;

  const box = document.getElementById('cbWeapons'); box.innerHTML = '';
  for (const key of weaponsForRole(shooter.role, ROLE_LOADOUTS)) {
    const wp = WEAPONS[key], reach = weaponCanFire(wp, shooter.moved, s);
    const b = document.createElement('button');
    b.className = 'wpick' + (shooter.weapon === wp ? ' on' : '') + (reach.ok ? '' : ' out');
    b.innerHTML = `<b>${wp.name}</b><span>${wp.a} dés · ${wp.bs}+ · ${wp.dn}/${wp.dc} · ${wp.range ? wp.range + '″' : '∞'}${wp.heavy ? ' · lourde' : ''}</span><em>${reach.ok ? 'à portée' : reach.why}</em>`;
    b.onclick = () => selectWeapon(key);
    box.appendChild(b);
  }
  document.getElementById('btnFire').disabled = !weaponCanFire(shooter.weapon, shooter.moved, s).ok;
}

// Équipe durablement l'arme choisie et met à jour la modale et le panneau latéral.
function selectWeapon(key) {
  if (!state.pending || state.pending.shooter.weapon === WEAPONS[key]) return;
  audio(); state.pending.shooter.weapon = WEAPONS[key]; sfx.pick();
  shotBrief(); refresh();
}

export function declareShot(shooter, target, s) {
  state.pending = { shooter, target, s };
  state.busy = true; state.hoverModel = null;
  document.getElementById('cbShooter').textContent = shooter.name;
  document.getElementById('cbTarget').textContent = target.name;
  shotBrief();
  document.getElementById('cbCta').style.display = 'flex';
  field.style.display = 'none';
  document.getElementById('cbVerdict').textContent = '';
  document.getElementById('cbSkip').textContent = '';
  document.getElementById('combat').classList.add('show');
  refresh();
}

export function cancelShot() {
  state.pending = null; state.busy = false;
  document.getElementById('combat').classList.remove('show');
  refresh();
}

export async function fire() {
  if (!state.pending) return;
  const { shooter, target, s } = state.pending;
  if (!weaponCanFire(shooter.weapon, shooter.moved, s).ok) return;
  state.speed = 1;
  document.getElementById('cbCta').style.display = 'none';
  document.getElementById('cbSkip').textContent = 'clique pour accélérer';
  field.style.display = 'block';
  field.querySelectorAll('.die').forEach(d => d.remove());
  const bs = effectiveBs(shooter.weapon.bs, shooter.aimed);
  document.getElementById('labAtk').innerHTML = `Attaque<b>touche ${bs}+</b>`;
  document.getElementById('labDef').innerHTML = `Défense<b>sauve ${target.sv}+</b>`;
  const nAtk = document.getElementById('noteAtk'), nDef = document.getElementById('noteDef');
  nAtk.className = 'f-note'; nDef.className = 'f-note';
  const tally = document.getElementById('tally'); tally.className = 'tally';
  document.getElementById('tallyNum').textContent = '0';

  // --- coups de feu sur le plateau
  sfx.shot();
  addFx({ type: 'muzzle', x: shooter.x, y: shooter.y, dur: FX_MUZZLE_MS });
  for (let i = 0; i < shooter.weapon.a; i++)
    setTimeout(() => addFx({ type: 'tracer', from: shooter, to: target, dur: FX_TRACER_MS }), i * TRACER_STAGGER);

  // --- jet d'attaque
  const atk = await throwDice(shooter.weapon.a, ROW.atk, 'left');
  let hits = [], crits = [], miss = [];
  for (const d of atk) {
    await sleep(DIE_REVEAL_STEP);
    if (isCrit(d.v)) { d.el.classList.add('crit'); crits.push(d); sfx.hitDie(); }
    else if (isHit(d.v, bs)) { d.el.classList.add('hit'); hits.push(d); sfx.hitDie(); }
    else { d.el.classList.add('miss'); miss.push(d); }
  }
  await sleep(ATTACK_SETTLE);
  // les échecs quittent la table
  miss.forEach((d, i) => { place(d.el, d.x, ROW.atk + DIE_MISS_DROP, d.rot + DIE_MISS_ROT, DIE_MISS_SCALE); d.el.style.opacity = DIE_MISS_OPACITY; });
  const kept = [...crits, ...hits];
  kept.forEach((d, i) => { d.x = DX + i * GAP; place(d.el, d.x, ROW.atk, d.rot, 1); });
  nAtk.innerHTML = kept.length
    ? `<em>${kept.length} touche${kept.length > 1 ? 's' : ''}</em>${crits.length ? ` dont <em>${crits.length} critique${crits.length > 1 ? 's' : ''}</em>` : ''}`
    : 'aucune touche';
  nAtk.classList.add('show');
  await sleep(ATTACK_NOTE_HOLD);

  if (!kept.length) {
    document.getElementById('cbVerdict').innerHTML = 'La rafale se perd.';
    journal(`<b>${shooter.name}</b> tire sur <b>${target.name}</b> et manque.`);
    sfx.no();
    await endShot(shooter, 0, target, s);
    return;
  }

  // --- jet de défense
  nDef.innerHTML = `<em>${target.name}</em> doit encaisser…`;
  nDef.classList.add('show');
  await sleep(DEFENSE_INTRO);
  const def = await throwDice(DEFENSE_DICE, ROW.def, 'right');
  let saves = [], csaves = [];
  for (const d of def) {
    await sleep(DIE_REVEAL_STEP);
    if (isCrit(d.v)) { d.el.classList.add('crit'); csaves.push(d); sfx.save(); }
    else if (isSave(d.v, target.sv)) { d.el.classList.add('save'); saves.push(d); sfx.save(); }
    else d.el.classList.add('miss');
  }
  if (s.cover) {
    await sleep(COVER_DIE_DELAY);
    const el = makeDie(); paintDie(el, target.sv); el.classList.add('cover');
    place(el, DX + DEFENSE_DICE * GAP + COVER_DIE_OFFSET, ROW.def, COVER_DIE_ROT, 1); el.classList.add('land');
    saves.push({ el, v: target.sv, x: DX + DEFENSE_DICE * GAP + COVER_DIE_OFFSET, rot: COVER_DIE_ROT }); sfx.save();
  }
  const failed = def.filter(d => !saves.includes(d) && !csaves.includes(d));
  failed.forEach(d => { place(d.el, d.x, ROW.def + DIE_MISS_DROP, d.rot + DIE_MISS_ROT, DIE_MISS_SCALE); d.el.style.opacity = DIE_MISS_OPACITY; });
  const goodDef = [...csaves, ...saves];
  goodDef.forEach((d, i) => { d.x = DX + i * GAP; place(d.el, d.x, ROW.def, d.rot, 1); });
  nDef.innerHTML = goodDef.length
    ? `<em>${goodDef.length} sauvegarde${goodDef.length > 1 ? 's' : ''}</em>${s.cover ? ' (dont le dé de couvert)' : ''}`
    : 'aucune sauvegarde';
  await sleep(DEFENSE_NOTE_HOLD);

  // --- résolution des annulations et des dégâts (règle pure)
  const outcome = resolveShot({
    atkRolls: atk.map(d => d.v), defRolls: def.map(d => d.v),
    bs, sv: target.sv, cover: s.cover, dn: shooter.weapon.dn, dc: shooter.weapon.dc,
  });

  // --- annulations, une par une (l'animation suit les comptes de la règle)
  let rc = [...crits], rh = [...hits], ns = [...saves], cs = [...csaves];
  const ops = [];
  for (let i = 0; i < outcome.critCancelledByCrit; i++) ops.push({ sv: [cs.shift()], hit: rc.shift(), label: 'critique annulée' });
  ns.push(...cs); cs = [];
  for (let i = 0; i < outcome.critCancelledByPair; i++) ops.push({ sv: [ns.shift(), ns.shift()], hit: rc.shift(), label: 'critique annulée à deux dés' });
  for (let i = 0; i < outcome.hitCancelled; i++) ops.push({ sv: [ns.shift()], hit: rh.shift(), label: 'touche annulée' });

  for (const op of ops) {
    const hx = op.hit.x;
    op.sv.forEach(sv => place(sv.el, hx, ROW.atk, sv.rot, 1));
    await sleep(CANCEL_ALIGN);
    op.sv.forEach(sv => sv.el.classList.add('pop'));
    op.hit.el.classList.add('pop');
    sfx.cancel();
    addFx({ type: 'shield', x: target.x, y: target.y, dur: FX_SHIELD_MS });
    await sleep(CANCEL_POP);
  }

  // --- dégâts restants
  const left = [...rc, ...rh];
  const dmg = outcome.damage;
  if (left.length) {
    tally.classList.add('show');
    left.forEach(d => d.el.classList.add('pulse'));
    let shown = 0;
    for (const d of left) {
      const fromCrit = rc.includes(d);
      shown += fromCrit ? shooter.weapon.dc : shooter.weapon.dn;
      document.getElementById('tallyNum').textContent = shown;
      tone(fromCrit ? TONE_CRIT_HZ : TONE_HIT_HZ, .1, 'triangle', .1);
      addFx({
        type: 'impact', x: target.x + (Math.random() - .5) * IMPACT_JITTER, y: target.y + (Math.random() - .5) * IMPACT_JITTER,
        dur: FX_IMPACT_MS, seed: Math.random() * IMPACT_SEED_RANGE,
      });
      target.flash = TARGET_FLASH; state.shake = fromCrit ? SHAKE_CRIT : SHAKE_HIT;
      await sleep(DAMAGE_STEP);
    }
  }
  await sleep(DAMAGE_SETTLE);

  if (dmg > 0) {
    target.hp = Math.max(0, target.hp - dmg);
    sfx.wound(); state.shake = SHAKE_WOUND;
    addFx({ type: 'float', x: target.x, y: target.y, text: '−' + dmg, color: '#ffb27a', dur: FX_FLOAT_DMG_MS, size: FLOAT_DMG_SIZE });
    document.getElementById('cbVerdict').innerHTML =
      `<em>${dmg} dégâts</em> — ${target.name} passe à ${target.hp} PV`;
    journal(`<b>${shooter.name}</b> touche <b>${target.name}</b> : ${dmg} dégâts${s.cover ? ' (couvert)' : ''}.`);
    refresh();
    if (target.hp <= 0) {
      await sleep(DOWN_DELAY);
      target.alive = false; sfx.down();
      addFx({ type: 'float', x: target.x, y: target.y, text: 'hors de combat', color: '#e6e1d3', dur: FX_FLOAT_DOWN_MS, size: FLOAT_SMALL_SIZE });
      document.getElementById('cbVerdict').innerHTML = `<em>${target.name} est hors de combat.</em>`;
      journal(`<b>${target.name}</b> est mis hors de combat.`);
    }
  } else {
    document.getElementById('cbVerdict').innerHTML = 'Tout est encaissé.';
    addFx({ type: 'float', x: target.x, y: target.y, text: 'encaissé', color: '#9dc4dd', dur: FX_FLOAT_SAVE_MS, size: FLOAT_SMALL_SIZE });
    journal(`<b>${shooter.name}</b> touche <b>${target.name}</b>, sans dégât.`);
    sfx.save();
  }
  await endShot(shooter, dmg, target, s);
}

async function throwDice(n, row, from) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const el = makeDie();
    const startX = from === 'left' ? DIE_ENTER_LEFT : DIE_ENTER_RIGHT;
    place(el, startX, row + (Math.random() - .5) * DIE_ENTER_JITTER_Y, (Math.random() - .5) * DIE_ENTER_ROT, DIE_ENTER_SCALE);
    out.push({ el, x: DX + i * GAP, rot: (Math.random() - .5) * DIE_REST_ROT, v: 1 });
  }
  sfx.throwDice();
  const spin = setInterval(() => out.forEach(d => paintDie(d.el, 1 + Math.floor(Math.random() * DICE_FACES))), DIE_SPIN_INTERVAL);
  await sleep(SPIN_HOLD);
  out.forEach((d, i) => setTimeout(() => { place(d.el, d.x, row, d.rot, 1); sfx.land(); }, i * DIE_DROP_STEP * state.speed));
  await sleep(DIE_DROP_STEP * n + DROP_SETTLE);
  clearInterval(spin);
  out.forEach(d => { d.v = 1 + Math.floor(state.rng() * DICE_FACES); paintDie(d.el, d.v); d.el.classList.add('land'); });
  await sleep(DIE_LAND_HOLD);
  return out;
}

async function endShot(shooter, dmg, target, s) {
  shooter.ap--; shooter.shot = true; shooter.aimed = false; shooter.activated = true; state.undoState = null;
  await sleep(dmg > 0 ? ENDSHOT_WAIT_DMG : ENDSHOT_WAIT_NODMG);
  document.getElementById('combat').classList.remove('show');
  field.querySelectorAll('.die').forEach(d => d.remove());
  state.pending = null; state.busy = false; state.speed = 1;
  if (checkEnd()) return;
  afterAction(shooter);
  refresh();
}

document.getElementById('btnFire').onclick = ev => { ev.stopPropagation(); audio(); fire(); };
document.getElementById('btnCancelShot').onclick = ev => { ev.stopPropagation(); cancelShot(); };
document.getElementById('combat').addEventListener('click', () => { if (state.pending && field.style.display !== 'none') state.speed = SPEED_FAST; });
