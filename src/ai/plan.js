import { OBJECTIVE_RANGE, AI_MAX_PER_OBJECTIVE, AI_ENDGAME_TURNS, MAXTURN } from '../config.js';
import { dist } from '../rules/geometry.js';

// ============================================================
//  Plan de camp de l'IA — niveau stratégique, PUR.
//  Assigne à chaque figurine un but ; le moteur d'utilité (niveau tactique) l'exécute.
//  Buts : { kind:'seize', at } (prendre/tenir un objectif) ou { kind:'attack' } (engager l'ennemi).
// ============================================================

// Figurine libre la plus proche du point `o` (non déjà assignée), ou null.
function nearestFree(own, taken, o) {
  let best = null, bestD = Infinity;
  for (const m of own) {
    if (taken.has(m)) continue;
    const d = dist(m, o);
    if (d < bestD) { bestD = d; best = m; }
  }
  return best;
}

// Objectif le plus proche d'une figurine (parmi `objectives`).
function nearestObjective(m, objectives) {
  return objectives.reduce((a, b) => (dist(m, b) < dist(m, a) ? b : a));
}

// Nombre d'ennemis à portée d'un objectif.
function enemiesAt(models, o, side) {
  return models.filter(m => m.alive && m.team !== side && dist(m, o) <= OBJECTIVE_RANGE).length;
}

// Posture selon le tour et l'écart de points (du point de vue de `side`) :
// - `objectiveFocus` : les figurines en trop sécurisent les objectifs (le score se fige chaque
//   tour) plutôt que d'attaquer — vrai en fin de partie ou quand l'IA est menée ; neutre sinon.
// - `contestCap` : plafond de figurines par objectif, relevé quand l'IA est menée en fin de partie
//   pour arracher un objectif disputé.
function tempo(state, side) {
  const other = side === 'A' ? 'B' : 'A';
  const score = state.score || { A: 0, B: 0 };
  const lead = score[side] - score[other];
  const endgame = MAXTURN - state.turn <= AI_ENDGAME_TURNS;
  return {
    objectiveFocus: endgame || lead < 0,
    contestCap: (lead < 0 && endgame) ? AI_MAX_PER_OBJECTIVE + 1 : AI_MAX_PER_OBJECTIVE,
  };
}

// Assigne un but à chaque figurine vivante du camp `side`. On sécurise d'abord les objectifs les
// moins défendus (points les plus faciles), en y envoyant assez de figurines pour départager le
// défenseur (`enemis + 1`, plafonné par le tempo), les plus proches d'abord — ce qui garde en
// place les tenants déjà à portée. Selon le tempo (tour + écart de points), les figurines restantes
// renforcent les objectifs ou engagent l'ennemi.
export function planSquad(state, side) {
  const { models, objectives } = state;
  const own = models.filter(m => m.alive && m.team === side);
  const goals = new Map();
  const taken = new Set();
  const { objectiveFocus, contestCap } = tempo(state, side);

  const ranked = objectives
    .map(o => ({ o, need: Math.min(contestCap, enemiesAt(models, o, side) + 1) }))
    .sort((a, b) => a.need - b.need);

  for (const { o, need } of ranked) {
    for (let k = 0; k < need; k++) {
      const cand = nearestFree(own, taken, o);
      if (!cand) break;
      goals.set(cand, { kind: 'seize', at: o }); taken.add(cand);
    }
  }

  for (const m of own) {
    if (taken.has(m)) continue;
    goals.set(m, (objectiveFocus && objectives.length) ? { kind: 'seize', at: nearestObjective(m, objectives) } : { kind: 'attack' });
  }
  return goals;
}
