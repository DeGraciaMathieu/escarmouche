import { BW, BH, MOVE_EPSILON, TERRAIN_MARGIN_FACTOR } from '../config.js';
import { dist, inflate, pointInRect } from './geometry.js';
import { findPath } from './pathfind.js';

// Vérifie qu'un déplacement de m vers `to` est légal et renvoie le chemin (points de passage)
// contournant le décor : bords du plateau, socle qui rentre, place occupée, puis longueur du
// chemin contourné ≤ mouvement. La distance dépensée est la longueur du chemin, pas la ligne droite.
export function moveCheck(m, to, models, terrain) {
  const from = { x: m.x, y: m.y }, straight = dist(from, to);
  if (to.x < m.r || to.y < m.r || to.x > BW - m.r || to.y > BH - m.r) return { ok: false, why: 'hors du plateau', d: straight };
  const blockers = [];
  for (const rect of terrain) {
    const big = inflate(rect, m.r * TERRAIN_MARGIN_FACTOR);
    // si la figurine part déjà dans la marge de ce décor, on la laisse s'en dégager :
    // seul le décor lui-même reste infranchissable et il ne bloque pas le trajet
    const stuck = pointInRect(from, big);
    if (pointInRect(to, stuck ? rect : big)) return { ok: false, why: 'le socle ne rentre pas', d: straight };
    if (!stuck) blockers.push(big);
  }
  for (const o of models) {
    if (o === m || !o.alive) continue;
    if (dist(o, to) < o.r + m.r) return { ok: false, why: 'place occupée', d: straight };
  }
  const path = findPath(from, to, blockers);
  if (!path) return { ok: false, why: 'trop loin — ' + m.M + '″ maximum', d: straight };
  let d = 0;
  for (let i = 1; i < path.length; i++) d += dist(path[i - 1], path[i]);
  if (d > m.M + MOVE_EPSILON) return { ok: false, why: 'trop loin — ' + m.M + '″ maximum', d };
  return { ok: true, d, path };
}
