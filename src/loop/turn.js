import { MAXTURN, FLASH_SIDE_MS, FLASH_TURN_MS, OBJECTIVE_RANGE } from '../config.js';
import { TEAMS, state } from '../state/game.js';
import { decideActivationEnd, annihilationWinner, scoreWinner } from '../rules/turn.js';
import { scoreObjectives } from '../rules/objective.js';
import { awardKill, addObjectiveScore } from '../rules/score.js';
import { remaining } from '../rules/squad.js';
import { sfx } from '../audio.js';
import { refresh, journal } from '../render/ui.js';

// Crédite le camp d'un kill (figurine ennemie mise hors de combat). Appelé par les résolutions
// de tir et de corps à corps au moment où la victime tombe.
export function registerKill(killerTeam) { state.score = awardKill(state.score, killerTeam); }

// Objectifs contrôlés à la fin du tour qui s'achève : ajoute les points et journalise le bilan.
function scoreEndOfTurn() {
  const held = scoreObjectives(state.models, state.objectives, OBJECTIVE_RANGE);
  state.score = addObjectiveScore(state.score, held);
  if (held.A || held.B) journal(`<b>Fin du tour ${state.turn}</b> — objectifs tenus : ${TEAMS.A.name} ${held.A}, ${TEAMS.B.name} ${held.B}.`);
}

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
  scoreEndOfTurn();
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
  const win = forced || scoreWinner(state.score);
  const scoreLine = `Score final — ${TEAMS.A.name} ${state.score.A} · ${TEAMS.B.name} ${state.score.B}`;
  const sub = forced ? `Escouade adverse anéantie · ${scoreLine}` : scoreLine;
  document.getElementById('bannerTitle').textContent = win ? TEAMS[win].name + " l'emporte" : 'Match nul';
  document.getElementById('bannerSub').textContent = sub;
  document.getElementById('banner').classList.add('show');
  state.busy = false; refresh();
}

export function select(m) { if (!state.busy) { state.selected = m; refresh(); } }
