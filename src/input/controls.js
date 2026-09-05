import { BW, BH, SELECT_MARGIN, DRAG_MIN_DISTANCE, MOVE_ANIM_BASE, MOVE_ANIM_PER_INCH, TOAST_MS, SPEED_FAST } from '../config.js';
import { cv } from '../canvas.js';
import { TERRAIN, state } from '../state/game.js';
import { dist } from '../rules/geometry.js';
import { canTarget } from '../rules/sight.js';
import { moveCheck } from '../rules/movement.js';
import { engagedModel } from '../rules/turn.js';
import { effectiveBs } from '../rules/combat.js';
import { sfx, audio, tone } from '../audio.js';
import { refresh, journal } from '../render/ui.js';
import { select, afterAction, endActivation } from '../loop/turn.js';
import { declareShot, cancelShot, fire } from '../loop/combat.js';

function toBoard(ev) {
  const r = cv.getBoundingClientRect();
  return { x: (ev.clientX - r.left) / r.width * BW, y: (ev.clientY - r.top) / r.height * BH };
}
function modelAt(p) { for (const m of state.models) if (m.alive && dist(m, p) <= m.r + SELECT_MARGIN) return m; return null; }

let toastTimer = null;
function toast(msg, ev) {
  const t = document.getElementById('toast'), wrap = document.getElementById('boardWrap').getBoundingClientRect();
  if (ev) { t.style.left = (ev.clientX - wrap.left) + 'px'; t.style.top = (ev.clientY - wrap.top) + 'px'; }
  else { t.style.left = '50%'; t.style.top = '50%'; }
  t.textContent = msg; t.classList.add('show'); sfx.no();
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), TOAST_MS);
}

cv.addEventListener('mousedown', ev => {
  if (state.busy || state.over) return; audio();
  const p = toBoard(ev), m = modelAt(p); if (!m) return;
  if (m.team === state.side && !m.activated) {
    const busy = engagedModel(state.models, state.side);
    if (busy) { select(busy); toast("termine l'activation en cours", ev); return; }
    select(m); if (m.ap > 0) { state.drag = { m, to: { x: m.x, y: m.y }, chk: { ok: false, d: 0 } }; sfx.pick(); }
  } else if (m.team === state.side) { select(m); toast('déjà activée ce tour', ev); }
  else {
    // figurine adverse : si elle est en ligne de vue, on garde le tireur sélectionné
    // pour que le clic ouvre la modale de tir au lieu de changer la sélection
    const chk = (state.selected && state.selected.team === state.side) ? canTarget(state.selected, m, TERRAIN) : { ok: false };
    if (!chk.ok) select(m);
  }
});
cv.addEventListener('mousemove', ev => {
  const p = toBoard(ev), m = modelAt(p);
  if (state.drag) { state.drag.to = p; state.drag.chk = moveCheck(state.drag.m, p, state.models, TERRAIN); state.hoverModel = null; cv.style.cursor = 'grabbing'; return; }
  state.hoverModel = m;
  cv.style.cursor = !m ? 'default'
    : (state.selected && m.team !== state.selected.team && canTarget(state.selected, m, TERRAIN).ok) ? 'crosshair'
      : (m.team === state.side && !m.activated) ? 'grab' : 'pointer';
});
cv.addEventListener('mouseleave', () => { state.hoverModel = null; });
window.addEventListener('mouseup', ev => {
  if (!state.drag) return;
  const d = state.drag; state.drag = null; cv.style.cursor = 'default';
  if (d.chk.d <= DRAG_MIN_DISTANCE) { refresh(); return; }
  if (d.chk.ok) {
    state.undoState = { m: d.m, x: d.m.x, y: d.m.y, moved: d.m.moved };
    const path = d.chk.path, to = path[path.length - 1];
    d.m.anim = { path, t0: performance.now(), dur: MOVE_ANIM_BASE + d.chk.d * MOVE_ANIM_PER_INCH };
    d.m.x = to.x; d.m.y = to.y; d.m.ap--; d.m.moved = true; d.m.activated = true;
    journal(`<b>${d.m.name}</b> se déplace de ${d.chk.d.toFixed(1)}″.`);
    afterAction(d.m);
  } else toast(d.chk.why, ev);
  refresh();
});
cv.addEventListener('click', ev => {
  if (state.busy || state.over || state.drag) return;
  const p = toBoard(ev), m = modelAt(p);
  if (!m || !state.selected || m.team === state.selected.team) return;
  if (state.selected.team !== state.side) { toast('cette figurine ne joue pas ce tour', ev); return; }
  const chk = canTarget(state.selected, m, TERRAIN);
  if (!chk.ok) { toast(chk.why, ev); return; }
  declareShot(state.selected, m, chk.s);
});

document.getElementById('btnAim').onclick = () => {
  if (!state.selected || state.selected.ap < 1 || state.selected.aimed || state.selected.shot || state.pending) return;
  audio(); state.selected.aimed = true; state.selected.ap--; state.selected.activated = true; state.undoState = null;
  tone(660, .12, 'triangle', .1, 880);
  journal(`<b>${state.selected.name}</b> se met en joue : touche à ${effectiveBs(state.selected.weapon.bs, true)}+.`);
  afterAction(state.selected);
};
document.getElementById('btnUndo').onclick = () => {
  if (!state.undoState || state.undoState.m !== state.selected || state.selected.shot) return;
  audio();
  state.selected.x = state.undoState.x; state.selected.y = state.undoState.y; state.selected.anim = null;
  state.selected.ap++; state.selected.moved = state.undoState.moved;
  if (state.selected.ap >= state.selected.apl) state.selected.activated = false;
  state.undoState = null; sfx.pick();
  journal(`Déplacement de <b>${state.selected.name}</b> annulé.`);
  refresh();
};
document.getElementById('btnEnd').onclick = () => { if (!state.busy && !state.over && state.selected && state.selected.team === state.side) endActivation(); };

window.addEventListener('keydown', ev => {
  if (state.over) return;
  if (state.pending) {
    if (ev.key === 'Enter') { ev.preventDefault(); if (document.getElementById('cbCta').style.display !== 'none') fire(); }
    else if (ev.key === 'Escape') { if (document.getElementById('cbCta').style.display !== 'none') cancelShot(); }
    else if (ev.key === ' ') { ev.preventDefault(); state.speed = SPEED_FAST; }
    return;
  }
  if (state.busy) return;
  if (ev.key === 'Tab') {
    ev.preventDefault();
    if (engagedModel(state.models, state.side)) return;
    const pool = state.models.filter(m => m.alive && m.team === state.side && !m.activated);
    if (!pool.length) return;
    select(pool[(pool.indexOf(state.selected) + 1) % pool.length]);
  }
  else if (ev.key === ' ') { ev.preventDefault(); document.getElementById('btnEnd').click(); }
  else if (ev.key === 'v' || ev.key === 'V') document.getElementById('btnAim').click();
  else if (ev.key === 'z' || ev.key === 'Z') document.getElementById('btnUndo').click();
  else if (ev.key === 'Escape') { state.selected = null; refresh(); }
});
