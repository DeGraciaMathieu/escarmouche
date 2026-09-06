import { OBJECTIVES, OBJECTIVE_RANGE } from '../config.js';
import { dist } from '../rules/geometry.js';
import { controlOf } from '../rules/objective.js';

// ============================================================
//  Plan de camp de l'IA — niveau stratégique, PUR.
//  Assigne à chaque figurine un but ; le moteur d'utilité (niveau tactique) l'exécute.
//  Buts : { kind:'seize', at } (prendre/tenir un objectif) ou { kind:'attack' } (engager l'ennemi).
// ============================================================

// Figurine libre la plus proche du point `o` (non déjà assignée).
function nearestFree(own, taken, o) {
  let best = null, bestD = Infinity;
  for (const m of own) {
    if (taken.has(m)) continue;
    const d = dist(m, o);
    if (d < bestD) { bestD = d; best = m; }
  }
  return best;
}

// Figurine libre la plus proche du point `o` mais déjà à portée `range` (pour tenir un objectif
// déjà contrôlé sans le quitter).
function nearestWithin(own, taken, o, range) {
  let best = null, bestD = Infinity;
  for (const m of own) {
    if (taken.has(m) || dist(m, o) > range) continue;
    const d = dist(m, o);
    if (d < bestD) { bestD = d; best = m; }
  }
  return best;
}

// Assigne un but à chaque figurine vivante du camp `side`. Pour chaque objectif : on garde le
// tenant le plus proche s'il est à nous, sinon on y envoie la figurine libre la plus proche pour
// le (re)prendre. Les figurines non assignées engagent l'ennemi. Rend une Map(model → goal).
export function planSquad(state, side) {
  const { models } = state;
  const own = models.filter(m => m.alive && m.team === side);
  const goals = new Map();
  const taken = new Set();

  for (const o of OBJECTIVES) {
    const controlled = controlOf(models, o, OBJECTIVE_RANGE) === side;
    const cand = controlled
      ? nearestWithin(own, taken, o, OBJECTIVE_RANGE)
      : nearestFree(own, taken, o);
    if (cand) { goals.set(cand, { kind: 'seize', at: o }); taken.add(cand); }
  }

  for (const m of own) if (!taken.has(m)) goals.set(m, { kind: 'attack' });
  return goals;
}
