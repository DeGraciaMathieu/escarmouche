import { BW, BH, SELECT_MARGIN, DRAG_MIN_DISTANCE, TOAST_MS, SPEED_FAST } from '../config.js';
import { cv } from '../canvas.js';
import { state } from '../state/game.js';
import { dist } from '../rules/geometry.js';
import { canTarget, canFight, inControlRange } from '../rules/sight.js';
import { moveCheck } from '../rules/movement.js';
import { engagedModel, canAct } from '../rules/turn.js';
import { sfx, audio } from '../audio.js';
import { refresh, journal } from '../render/ui.js';
import { select, endActivation } from '../loop/turn.js';
import { moveModel, aim } from '../loop/actions.js';
import { declareShot, cancelShot, fire } from '../loop/combat.js';
import { declareFight, cancelFight, fight } from '../loop/melee.js';
import { isAiControlled } from '../ai/runner.js';

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
  if (state.busy || state.over || isAiControlled(state.side)) return; audio();
  const p = toBoard(ev), m = modelAt(p); if (!m) return;
  if (m.team === state.side) {
    if (!canAct(m, state.models, state.side)) {
      // soit une autre figurine est engagée (finir son activation), soit plus de PA (activée)
      const busy = engagedModel(state.models, state.side);
      if (busy && busy !== m) { select(busy); toast("termine l'activation en cours", ev); return; }
      select(m); toast('déjà activée ce tour', ev); return;
    }
    // il reste un PA : on peut agir, y compris se déplacer une seconde fois dans l'activation
    select(m);
    state.drag = { m, to: { x: m.x, y: m.y }, chk: { ok: false, d: 0 } }; sfx.pick();
  } else {
    // figurine adverse : si elle est en ligne de vue, on garde le tireur sélectionné
    // pour que le clic ouvre la modale de tir au lieu de changer la sélection
    const chk = (state.selected && state.selected.team === state.side) ? canTarget(state.selected, m, state.terrain) : { ok: false };
    if (!chk.ok) select(m);
  }
});
cv.addEventListener('mousemove', ev => {
  const p = toBoard(ev), m = modelAt(p);
  if (state.drag) { state.drag.to = p; state.drag.chk = moveCheck(state.drag.m, p, state.models, state.terrain); state.hoverModel = null; cv.style.cursor = 'grabbing'; return; }
  state.hoverModel = m;
  cv.style.cursor = !m ? 'default'
    : (state.selected && m.team !== state.selected.team && canTarget(state.selected, m, state.terrain).ok) ? 'crosshair'
      : (m.team === state.side && !m.activated) ? 'grab' : 'pointer';
});
cv.addEventListener('mouseleave', () => { state.hoverModel = null; });
window.addEventListener('mouseup', ev => {
  if (!state.drag) return;
  const d = state.drag; state.drag = null; cv.style.cursor = 'default';
  if (d.chk.d <= DRAG_MIN_DISTANCE) { refresh(); return; }
  const chk = moveModel(d.m, d.to, d.chk);
  if (!chk.ok) toast(chk.why, ev);
  refresh();
});
cv.addEventListener('click', ev => {
  if (state.busy || state.over || state.drag || isAiControlled(state.side)) return;
  const p = toBoard(ev), m = modelAt(p);
  if (!m || !state.selected || m.team === state.selected.team) return;
  if (state.selected.team !== state.side) { toast('cette figurine ne joue pas ce tour', ev); return; }
  const chk = canTarget(state.selected, m, state.terrain);
  if (!chk.ok) { toast(chk.why, ev); return; }
  // au contact → corps à corps (prioritaire) ; au-delà → tir
  if (inControlRange(state.selected, m)) {
    const f = canFight(state.selected, m, state.terrain);
    if (!f.ok) { toast(f.why, ev); return; }
    declareFight(state.selected, m, f.s);
  } else declareShot(state.selected, m, chk.s);
});

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
  if (state.over || isAiControlled(state.side)) return;
  if (state.pending) {
    if (ev.key === 'Enter') { ev.preventDefault(); if (document.getElementById('cbCta').style.display !== 'none') fire(); }
    else if (ev.key === 'Escape') { if (document.getElementById('cbCta').style.display !== 'none') cancelShot(); }
    else if (ev.key === ' ') { ev.preventDefault(); state.speed = SPEED_FAST; }
    return;
  }
  if (state.duel) {
    const cta = document.getElementById('duCta').style.display !== 'none';
    if (ev.key === 'Enter') { ev.preventDefault(); if (cta) fight(); }
    else if (ev.key === 'Escape') { if (cta) cancelFight(); }
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
  else if (ev.key === 'v' || ev.key === 'V') {
    if (!state.selected || state.selected.ap < 1 || state.selected.aimed || state.selected.shot || state.pending) return;
    audio(); aim(state.selected);
  }
  else if (ev.key === 'z' || ev.key === 'Z') document.getElementById('btnUndo').click();
  else if (ev.key === 'Escape') { state.selected = null; refresh(); }
});
