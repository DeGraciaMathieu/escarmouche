import { dist } from './geometry.js';

// Camp qui contrôle un objectif : celui qui a le plus de figurines vivantes à portée.
// Égalité (y compris aucune figurine de part et d'autre) → objectif disputé, personne ne le
// contrôle (null).
export function controlOf(models, objective, range) {
  let a = 0, b = 0;
  for (const m of models) {
    if (!m.alive || dist(m, objective) > range) continue;
    if (m.team === 'A') a++; else b++;
  }
  if (a === b) return null;
  return a > b ? 'A' : 'B';
}

// Décompte des objectifs contrôlés par chaque camp à cet instant.
export function scoreObjectives(models, objectives, range) {
  const held = { A: 0, B: 0 };
  for (const o of objectives) {
    const c = controlOf(models, o, range);
    if (c) held[c]++;
  }
  return held;
}
