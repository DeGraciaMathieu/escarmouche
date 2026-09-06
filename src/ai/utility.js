import { dist } from '../rules/geometry.js';
import { canShoot, canFight, sight } from '../rules/sight.js';
import { moveCheck } from '../rules/movement.js';
import { attackDice, defenseDice, effectiveBs } from '../rules/combat.js';
import { AI_PRIO_FIGHT, AI_PRIO_AIM, AI_PRIO_SHOOT, AI_PRIO_MOVE, AI_PRIO_END,
  AI_W_KILL, AI_W_DAMAGE, AI_W_DIST, AI_COVER_FACTOR, AI_W_COVER, OBJECTIVE_RANGE, DICE_FACES } from '../config.js';

// ============================================================
//  Moteur d'utilité de l'IA — PUR (aucun DOM, aucun hasard).
//  Génère les actions possibles d'une figurine, chacune notée { priority, value } :
//  on retient la priorité la plus haute, puis on départage à la valeur tactique.
// ============================================================

const nearest = (m, list) => list.reduce((a, b) => (dist(m, b) < dist(m, a) ? b : a));

// Dégâts attendus (heuristique) d'un tir de `m` sur `target` vu par `s` : dés d'attaque × chance
// de touche × dégâts, moins les sauvegardes attendues. Le masquage retire une réussite, le couvert
// ajoute un dé de sauvegarde (sauf saturation) et réduit l'efficacité. Sert à comparer des cibles,
// pas à prédire le résultat réel (les dés restent lancés par resolveShot).
function expectedDamage(m, target, s) {
  const w = m.weapon;
  const hitChance = (DICE_FACES - effectiveBs(w.bs, m.aimed) + 1) / DICE_FACES;
  const hits = attackDice(w) * hitChance - (s.masked ? 1 : 0);
  const covered = s.cover && !w.saturate;
  const saveDice = defenseDice(w) + (covered ? 1 : 0);
  const saveChance = (DICE_FACES - target.sv + 1) / DICE_FACES;
  const net = Math.max(0, hits - saveDice * saveChance);
  return net * w.dn * (covered ? AI_COVER_FACTOR : 1);
}

// Valeur d'un tir : achever la cible prime (sécurise un kill), puis maximiser les dégâts attendus,
// puis départager par la proximité.
function shootValue(m, target, s) {
  const dmg = expectedDamage(m, target, s);
  return (dmg >= target.hp ? AI_W_KILL : 0) + dmg * AI_W_DAMAGE - dist(m, target) * AI_W_DIST;
}

// La destination `p` met-elle `m` à l'abri de l'ennemi le plus proche (vue coupée, couvert ou
// masquage) ? Rend 1 si oui, 0 sinon. On sonde `sight` depuis l'ennemi vers la destination.
function coverAt(p, m, enemies, terrain, models) {
  if (!enemies.length) return 0;
  const foe = nearest(p, enemies);
  const others = models.filter(x => x !== m);
  const s = sight(foe, { x: p.x, y: p.y, r: m.r, alive: true }, terrain, others);
  return (!s.los || s.cover || s.masked) ? 1 : 0;
}

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

// Meilleur déplacement vers `target` : on maximise la progression vers le but tout en préférant,
// à progression comparable, une destination à couvert de l'ennemi. Rend null si rien d'atteignable.
function bestApproach(m, target, enemies, models, terrain) {
  let best = null, bestScore = -Infinity;
  for (const p of approachDestinations(m, target)) {
    const chk = moveCheck(m, p, models, terrain);
    if (!chk.ok) continue;
    const to = chk.path[chk.path.length - 1];
    const score = -dist(target, to) + AI_W_COVER * coverAt(to, m, enemies, terrain, models);
    if (score > bestScore) { bestScore = score; best = { dest: p, d: dist(target, to) }; }
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
    // Tir : départagé par la valeur du tir (achever, dégâts attendus, proximité).
    for (const e of enemies) {
      const sh = canShoot(m, e, terrain, models);
      if (sh.ok) cands.push({ priority: AI_PRIO_SHOOT, value: shootValue(m, e, sh.s), intention: { type: 'shoot', model: m, target: e, s: sh.s } });
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
    const approach = bestApproach(m, moveTarget, enemies, models, terrain);
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
