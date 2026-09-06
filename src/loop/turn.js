import { MAXTURN, FLASH_SIDE_MS, FLASH_TURN_MS } from '../config.js';
import { TEAMS, state } from '../state/game.js';
import { decideActivationEnd, annihilationWinner, attritionWinner } from '../rules/turn.js';
import { aliveOf, remaining } from '../rules/squad.js';
import { sfx } from '../audio.js';
import { refresh, journal } from '../render/ui.js';

// Après une action : on termine l'activation si plus de points, sinon on rafraîchit.
// Si l'action se clôt sur un déplacement encore animé, on attend la fin du glissement avant de
// changer de camp (on gèle l'IA et la main humaine via `state.busy` pendant l'attente).
export function afterAction(m) {
  if (m.ap > 0) { refresh(); return; }
  if (m.anim) {
    state.busy = true;
    const delay = Math.max(0, m.anim.t0 + m.anim.dur - performance.now());
    setTimeout(() => { state.busy = false; endActivation(); }, delay);
  } else endActivation();
}

export function endActivation() {
  if (state.selected) { state.selected.activated = true; state.selected.ap = 0; state.selected.aimed = false; }
  state.selected = null; state.undoState = null;
  const decision = decideActivationEnd(state.models, state.side);
  if (decision.type === 'switch') { state.side = decision.side; announceSide(); }
  else if (decision.type === 'newTurn') { newTurn(); }
  else announceSide("L'escouade adverse a fini — tu enchaînes");
  autoSelect(); refresh();
}

function announceSide(sub) {
  const f = document.getElementById('flash');
  f.style.setProperty('--fc', TEAMS[state.side].color);
  document.getElementById('flashTitle').textContent = 'Aux ' + TEAMS[state.side].name;
  document.getElementById('flashSub').textContent = sub || `${remaining(state.models, state.side)} figurine${remaining(state.models, state.side) > 1 ? 's' : ''} à activer`;
  f.classList.add('show'); sfx.turn();
  setTimeout(() => f.classList.remove('show'), FLASH_SIDE_MS);
}

function newTurn() {
  if (state.turn >= MAXTURN) { finish(); return; }
  state.turn++;
  state.models.forEach(m => { m.activated = false; m.ap = m.apl; m.aimed = false; m.moved = false; m.shot = false; });
  state.side = 'A';
  const f = document.getElementById('flash');
  f.style.setProperty('--fc', '#c9a227');
  document.getElementById('flashTitle').textContent = 'Tour ' + state.turn;
  document.getElementById('flashSub').textContent = state.turn === MAXTURN ? 'dernier tour' : 'toutes les figurines se réactivent';
  f.classList.add('show'); sfx.turn();
  setTimeout(() => f.classList.remove('show'), FLASH_TURN_MS);
  journal(`<b>Tour ${state.turn}</b> — toutes les figurines se réactivent.`);
}

export function autoSelect() { if (state.over) return; state.selected = state.models.find(m => m.alive && m.team === state.side && !m.activated) || null; }

export function checkEnd() { const w = annihilationWinner(state.models); if (w) { finish(w); return true; } return false; }

function finish(forced) {
  state.over = true; state.selected = null; state.pending = null;
  document.getElementById('combat').classList.remove('show');
  let win = forced, sub = '';
  if (!win) {
    win = attritionWinner(state.models);
    sub = `Fin du tour ${MAXTURN} — ${aliveOf(state.models, 'A').length} contre ${aliveOf(state.models, 'B').length} figurines debout`;
  } else sub = 'Escouade adverse anéantie';
  document.getElementById('bannerTitle').textContent = win ? TEAMS[win].name + " l'emporte" : 'Match nul';
  document.getElementById('bannerSub').textContent = sub;
  document.getElementById('banner').classList.add('show');
  state.busy = false; refresh();
}

export function select(m) { if (!state.busy) { state.selected = m; refresh(); } }
