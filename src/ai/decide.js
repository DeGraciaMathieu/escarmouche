import { dist } from '../rules/geometry.js';
import { canShoot, canFight } from '../rules/sight.js';
import { moveCheck } from '../rules/movement.js';
import { meleeOptions } from '../rules/combat.js';
import { engagedModel } from '../rules/turn.js';

// ============================================================
//  Décision de l'IA — fonctions PURES (aucun DOM, aucun hasard).
//  Rendent une INTENTION, jamais un effet. Exécutées par le runner.
// ============================================================

const nearest = (m, list) => list.reduce((a, b) => (dist(m, b) < dist(m, a) ? b : a));

// Meilleure cible de tir : la plus faible en PV d'abord, puis la plus proche.
const bestTarget = (m, list) => list.reduce((a, b) => {
  if (b.hp !== a.hp) return b.hp < a.hp ? b : a;
  return dist(m, b) < dist(m, a) ? b : a;
});

// Cherche une destination légale (via moveCheck) qui rapproche le plus de `target`, en
// échantillonnant des points le long de l'axe (distances décroissantes) puis en éventail.
function approach(m, target, models, terrain) {
  const dx = target.x - m.x, dy = target.y - m.y, D = Math.hypot(dx, dy) || 1;
  const ux = dx / D, uy = dy / D, cands = [];
  for (let step = m.M; step >= 0.5; step -= 0.5) cands.push({ x: m.x + ux * step, y: m.y + uy * step });
  for (const ang of [0.4, -0.4, 0.9, -0.9]) {
    const c = Math.cos(ang), s = Math.sin(ang);
    cands.push({ x: m.x + (ux * c - uy * s) * m.M, y: m.y + (ux * s + uy * c) * m.M });
  }
  let best = null, bestD = Infinity;
  for (const p of cands) {
    const chk = moveCheck(m, p, models, terrain);
    if (!chk.ok) continue;
    const to = chk.path[chk.path.length - 1];
    const nd = Math.hypot(target.x - to.x, target.y - to.y);
    if (nd < bestD) { bestD = nd; best = p; }
  }
  return best;
}

// Intention suivante de l'IA du camp `side` : engager la figurine active (celle en cours
// d'activation, sinon la première non activée) et choisir son action selon l'heuristique.
export function decide(state, side) {
  const { models, terrain } = state;
  const m = engagedModel(models, side) || models.find(x => x.alive && x.team === side && !x.activated);
  if (!m) return { type: 'none' };
  if (m.ap <= 0) return { type: 'end', model: m };

  const enemies = models.filter(e => e.alive && e.team !== side);
  if (!enemies.length) return { type: 'end', model: m };

  if (!m.shot) {
    // 1) corps à corps si une cible est au contact et engageable
    const inReach = enemies.filter(e => canFight(m, e, terrain).ok);
    if (inReach.length) {
      const t = nearest(m, inReach);
      return { type: 'fight', model: m, target: t, s: canFight(m, t, terrain).s };
    }
    // 2) tir : viser d'abord si un PA le permet, puis tirer la meilleure cible
    const shootable = enemies.filter(e => canShoot(m, e, terrain).ok);
    if (shootable.length) {
      if (!m.aimed && m.ap >= 2) return { type: 'aim', model: m };
      const t = bestTarget(m, shootable);
      return { type: 'shoot', model: m, target: t, s: canShoot(m, t, terrain).s };
    }
  }
  // 3) se rapprocher de l'ennemi le plus proche
  const dest = approach(m, nearest(m, enemies), models, terrain);
  if (dest) return { type: 'move', model: m, dest };
  return { type: 'end', model: m };
}

// Choix de l'IA dans un duel (état vivant `duel`) : contrer une critique adverse seulement si
// elle est létale et parable, sinon frapper — critique d'abord.
export function decideMelee(duel) {
  const opts = meleeOptions(duel);
  if (!opts.length) return null;
  const me = duel[duel.turn], foe = duel[duel.turn === 'atk' ? 'def' : 'atk'];
  if (foe.crits > 0 && foe.dc >= me.hp) {
    const parry = opts.find(o => o.kind === 'parry' && o.die === 'crit' && o.target === 'crit');
    if (parry) return parry;
  }
  return opts.find(o => o.kind === 'strike' && o.die === 'crit')
      || opts.find(o => o.kind === 'strike');
}
