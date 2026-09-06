import { dist } from '../rules/geometry.js';
import { canShoot, canFight } from '../rules/sight.js';
import { moveCheck } from '../rules/movement.js';
import { AI_PRIO_FIGHT, AI_PRIO_AIM, AI_PRIO_SHOOT, AI_PRIO_MOVE, AI_PRIO_END, AI_TARGET_HP_WEIGHT, OBJECTIVE_RANGE } from '../config.js';

// ============================================================
//  Moteur d'utilité de l'IA — PUR (aucun DOM, aucun hasard).
//  Génère les actions possibles d'une figurine, chacune notée { priority, value } :
//  on retient la priorité la plus haute, puis on départage à la valeur tactique.
// ============================================================

const nearest = (m, list) => list.reduce((a, b) => (dist(m, b) < dist(m, a) ? b : a));

// Destinations candidates pour se rapprocher de `target` : le long de l'axe (distances
// décroissantes) puis en éventail, pour contourner un obstacle.
function approachDestinations(m, target) {
  const dx = target.x - m.x, dy = target.y - m.y, D = Math.hypot(dx, dy) || 1;
  const ux = dx / D, uy = dy / D, cands = [];
  for (let step = m.M; step >= 0.5; step -= 0.5) cands.push({ x: m.x + ux * step, y: m.y + uy * step });
  for (const ang of [0.4, -0.4, 0.9, -0.9]) {
    const c = Math.cos(ang), s = Math.sin(ang);
    cands.push({ x: m.x + (ux * c - uy * s) * m.M, y: m.y + (ux * s + uy * c) * m.M });
  }
  return cands;
}

// Meilleur déplacement pour se rapprocher de `target` (destination légale la plus proche du but),
// ou null si aucune n'est atteignable.
function bestApproach(m, target, models, terrain) {
  let best = null, bestD = Infinity;
  for (const p of approachDestinations(m, target)) {
    const chk = moveCheck(m, p, models, terrain);
    if (!chk.ok) continue;
    const to = chk.path[chk.path.length - 1];
    const nd = dist(target, to);
    if (nd < bestD) { bestD = nd; best = { dest: p, d: nd }; }
  }
  return best;
}

// Actions candidates de la figurine `m` du camp `side`, selon son but `goal` (voir ai/plan.js),
// chacune notée et portant son intention prête pour le runner. « Terminer » est toujours présent
// comme repli de plus basse priorité.
export function candidateActions(state, m, side, goal = { kind: 'attack' }) {
  const { models, terrain } = state;
  const enemies = models.filter(e => e.alive && e.team !== side);
  const cands = [{ priority: AI_PRIO_END, value: 0, intention: { type: 'end', model: m } }];
  if (!enemies.length) return cands;

  if (!m.shot) {
    // Mêlée au contact : prioritaire, départagée par la proximité.
    for (const e of enemies) {
      const f = canFight(m, e, terrain);
      if (f.ok) cands.push({ priority: AI_PRIO_FIGHT, value: -dist(m, e), intention: { type: 'fight', model: m, target: e, s: f.s } });
    }
    // Tir : départagé en achevant les cibles les plus faibles d'abord, puis les plus proches.
    for (const e of enemies) {
      const sh = canShoot(m, e, terrain, models);
      if (sh.ok) cands.push({ priority: AI_PRIO_SHOOT, value: -(e.hp * AI_TARGET_HP_WEIGHT + dist(m, e)), intention: { type: 'shoot', model: m, target: e, s: sh.s } });
    }
    // Viser : seulement s'il reste un tir à faire, un PA à dépenser et qu'on n'est pas déjà en joue.
    if (!m.aimed && m.ap >= 2 && cands.some(c => c.priority === AI_PRIO_SHOOT)) {
      cands.push({ priority: AI_PRIO_AIM, value: 0, intention: { type: 'aim', model: m } });
    }
  }

  // Déplacement selon le but : rejoindre l'objectif assigné (sauf si on y est déjà, auquel cas on
  // le tient sans bouger), sinon se rapprocher de l'ennemi le plus proche.
  const moveTarget = goal.kind === 'seize'
    ? (dist(m, goal.at) > OBJECTIVE_RANGE ? goal.at : null)
    : nearest(m, enemies);
  if (moveTarget) {
    const approach = bestApproach(m, moveTarget, models, terrain);
    if (approach) cands.push({ priority: AI_PRIO_MOVE, value: -approach.d, intention: { type: 'move', model: m, dest: approach.dest } });
  }

  return cands;
}

// Meilleure action : priorité la plus haute, puis valeur la plus haute.
export function bestAction(cands) {
  return cands.reduce((a, b) => {
    if (b.priority !== a.priority) return b.priority > a.priority ? b : a;
    return b.value > a.value ? b : a;
  });
}
