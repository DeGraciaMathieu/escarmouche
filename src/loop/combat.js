import { DEFENSE_DICE, DIE_ROW, DIE_START_X, DIE_GAP, DIE_SPIN_INTERVAL, SPEED_FAST, ENDSHOT_WAIT_DMG, ENDSHOT_WAIT_NODMG } from '../config.js';
import { state } from '../state/game.js';
import { isCrit, isHit, isSave, effectiveBs, resolveShot } from '../rules/combat.js';
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

export function declareShot(shooter, target, s) {
  state.pending = { shooter, target, s };
  state.busy = true; state.hoverModel = null;
  const bs = effectiveBs(shooter.weapon.bs, shooter.aimed);
  document.getElementById('cbShooter').textContent = shooter.name;
  document.getElementById('cbTarget').textContent = target.name;
  document.getElementById('cbMeta').textContent =
    `${s.len.toFixed(1)}″ · ${s.cover ? 'cible à couvert' : 'cible à découvert'}${shooter.aimed ? ' · en joue' : ''}`;
  document.getElementById('cbBrief').innerHTML = `
    <div class="col">Attaque<br><b>${shooter.weapon.a} dés, touche ${bs}+</b><br>${shooter.weapon.name}</div>
    <div class="col">Défense<br><b>3 dés, sauvegarde ${target.sv}+</b><br>${s.cover ? '+ 1 dé de couvert offert' : 'aucun couvert'}</div>
    <div class="col">Dégâts<br><b>${shooter.weapon.dn} par touche, ${shooter.weapon.dc} si critique</b><br>${target.name} a ${target.hp} PV</div>`;
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
  addFx({ type: 'muzzle', x: shooter.x, y: shooter.y, dur: 180 });
  for (let i = 0; i < shooter.weapon.a; i++)
    setTimeout(() => addFx({ type: 'tracer', from: shooter, to: target, dur: 230 }), i * 70);

  // --- jet d'attaque
  const atk = await throwDice(shooter.weapon.a, ROW.atk, 'left');
  let hits = [], crits = [], miss = [];
  for (const d of atk) {
    await sleep(130);
    if (isCrit(d.v)) { d.el.classList.add('crit'); crits.push(d); sfx.hitDie(); }
    else if (isHit(d.v, bs)) { d.el.classList.add('hit'); hits.push(d); sfx.hitDie(); }
    else { d.el.classList.add('miss'); miss.push(d); }
  }
  await sleep(120);
  // les échecs quittent la table
  miss.forEach((d, i) => { place(d.el, d.x, ROW.atk + 34, d.rot + 22, .8); d.el.style.opacity = .28; });
  const kept = [...crits, ...hits];
  kept.forEach((d, i) => { d.x = DX + i * GAP; place(d.el, d.x, ROW.atk, d.rot, 1); });
  nAtk.innerHTML = kept.length
    ? `<em>${kept.length} touche${kept.length > 1 ? 's' : ''}</em>${crits.length ? ` dont <em>${crits.length} critique${crits.length > 1 ? 's' : ''}</em>` : ''}`
    : 'aucune touche';
  nAtk.classList.add('show');
  await sleep(520);

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
  await sleep(340);
  const def = await throwDice(DEFENSE_DICE, ROW.def, 'right');
  let saves = [], csaves = [];
  for (const d of def) {
    await sleep(130);
    if (isCrit(d.v)) { d.el.classList.add('crit'); csaves.push(d); sfx.save(); }
    else if (isSave(d.v, target.sv)) { d.el.classList.add('save'); saves.push(d); sfx.save(); }
    else d.el.classList.add('miss');
  }
  if (s.cover) {
    await sleep(180);
    const el = makeDie(); paintDie(el, target.sv); el.classList.add('cover');
    place(el, DX + 3 * GAP + 16, ROW.def, -6, 1); el.classList.add('land');
    saves.push({ el, v: target.sv, x: DX + 3 * GAP + 16, rot: -6 }); sfx.save();
  }
  const failed = def.filter(d => !saves.includes(d) && !csaves.includes(d));
  failed.forEach(d => { place(d.el, d.x, ROW.def + 34, d.rot + 22, .8); d.el.style.opacity = .28; });
  const goodDef = [...csaves, ...saves];
  goodDef.forEach((d, i) => { d.x = DX + i * GAP; place(d.el, d.x, ROW.def, d.rot, 1); });
  nDef.innerHTML = goodDef.length
    ? `<em>${goodDef.length} sauvegarde${goodDef.length > 1 ? 's' : ''}</em>${s.cover ? ' (dont le dé de couvert)' : ''}`
    : 'aucune sauvegarde';
  await sleep(560);

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
    await sleep(260);
    op.sv.forEach(sv => sv.el.classList.add('pop'));
    op.hit.el.classList.add('pop');
    sfx.cancel();
    addFx({ type: 'shield', x: target.x, y: target.y, dur: 420 });
    await sleep(240);
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
      tone(fromCrit ? 720 : 600, .1, 'triangle', .1);
      addFx({
        type: 'impact', x: target.x + (Math.random() - .5) * .5, y: target.y + (Math.random() - .5) * .5,
        dur: 420, seed: Math.random() * 6,
      });
      target.flash = .7; state.shake = fromCrit ? 7 : 4.5;
      await sleep(230);
    }
  }
  await sleep(260);

  if (dmg > 0) {
    target.hp = Math.max(0, target.hp - dmg);
    sfx.wound(); state.shake = 8;
    addFx({ type: 'float', x: target.x, y: target.y, text: '−' + dmg, color: '#ffb27a', dur: 1100, size: 28 });
    document.getElementById('cbVerdict').innerHTML =
      `<em>${dmg} dégâts</em> — ${target.name} passe à ${target.hp} PV`;
    journal(`<b>${shooter.name}</b> touche <b>${target.name}</b> : ${dmg} dégâts${s.cover ? ' (couvert)' : ''}.`);
    refresh();
    if (target.hp <= 0) {
      await sleep(420);
      target.alive = false; sfx.down();
      addFx({ type: 'float', x: target.x, y: target.y, text: 'hors de combat', color: '#e6e1d3', dur: 1400, size: 20 });
      document.getElementById('cbVerdict').innerHTML = `<em>${target.name} est hors de combat.</em>`;
      journal(`<b>${target.name}</b> est mis hors de combat.`);
    }
  } else {
    document.getElementById('cbVerdict').innerHTML = 'Tout est encaissé.';
    addFx({ type: 'float', x: target.x, y: target.y, text: 'encaissé', color: '#9dc4dd', dur: 1000, size: 20 });
    journal(`<b>${shooter.name}</b> touche <b>${target.name}</b>, sans dégât.`);
    sfx.save();
  }
  await endShot(shooter, dmg, target, s);
}

async function throwDice(n, row, from) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const el = makeDie();
    const startX = from === 'left' ? -140 : 700;
    place(el, startX, row + (Math.random() - .5) * 40, (Math.random() - .5) * 260, .9);
    out.push({ el, x: DX + i * GAP, rot: (Math.random() - .5) * 16, v: 1 });
  }
  sfx.throwDice();
  const spin = setInterval(() => out.forEach(d => paintDie(d.el, 1 + Math.floor(Math.random() * 6))), DIE_SPIN_INTERVAL);
  await sleep(40);
  out.forEach((d, i) => setTimeout(() => { place(d.el, d.x, row, d.rot, 1); sfx.land(); }, i * 80 * state.speed));
  await sleep(80 * n + 380);
  clearInterval(spin);
  out.forEach(d => { d.v = 1 + Math.floor(state.rng() * 6); paintDie(d.el, d.v); d.el.classList.add('land'); });
  await sleep(160);
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
