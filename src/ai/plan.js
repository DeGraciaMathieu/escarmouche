import { OBJECTIVES, OBJECTIVE_RANGE, AI_MAX_PER_OBJECTIVE, MAXTURN } from '../config.js';
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

// Objectif le plus proche d'une figurine.
function nearestObjective(m) {
  return OBJECTIVES.reduce((a, b) => (dist(m, b) < dist(m, a) ? b : a));
}

// Nombre d'ennemis à portée d'un objectif.
function enemiesAt(models, o, side) {
  return models.filter(m => m.alive && m.team !== side && dist(m, o) <= OBJECTIVE_RANGE).length;
}

// Assigne un but à chaque figurine vivante du camp `side`. On sécurise d'abord les objectifs les
// moins défendus (points les plus faciles), en y envoyant assez de figurines pour départager le
// défenseur (`enemis + 1`, plafonné à AI_MAX_PER_OBJECTIVE), les plus proches d'abord — ce qui
// garde naturellement en place les tenants déjà à portée. Au dernier tour, les figurines restantes
// renforcent les objectifs (le score se fige à la fin du tour) ; sinon elles engagent l'ennemi.
export function planSquad(state, side) {
  const { models } = state;
  const own = models.filter(m => m.alive && m.team === side);
  const goals = new Map();
  const taken = new Set();

  const ranked = OBJECTIVES
    .map(o => ({ o, need: Math.min(AI_MAX_PER_OBJECTIVE, enemiesAt(models, o, side) + 1) }))
    .sort((a, b) => a.need - b.need);

  for (const { o, need } of ranked) {
    for (let k = 0; k < need; k++) {
      const cand = nearestFree(own, taken, o);
      if (!cand) break;
      goals.set(cand, { kind: 'seize', at: o }); taken.add(cand);
    }
  }

  const lastTurn = state.turn === MAXTURN;
  for (const m of own) {
    if (taken.has(m)) continue;
    goals.set(m, lastTurn ? { kind: 'seize', at: nearestObjective(m) } : { kind: 'attack' });
  }
  return goals;
}
