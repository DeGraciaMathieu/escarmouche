import { BW, BH, MOVE_EPSILON, TERRAIN_MARGIN_FACTOR } from '../config.js';
import { dist, inflate, pointInRect, segRectT } from './geometry.js';

// Vérifie qu'un déplacement de m vers `to` est légal :
// portée de mouvement, bords du plateau, décor (socle et trajet), place occupée.
export function moveCheck(m, to, models, terrain) {
  const from = { x: m.x, y: m.y }, d = dist(from, to);
  if (d > m.M + MOVE_EPSILON) return { ok: false, why: 'trop loin — ' + m.M + '″ maximum', d };
  if (to.x < m.r || to.y < m.r || to.x > BW - m.r || to.y > BH - m.r) return { ok: false, why: 'hors du plateau', d };
  for (const rect of terrain) {
    const big = inflate(rect, m.r * TERRAIN_MARGIN_FACTOR);
    // si la figurine part déjà dans la marge de ce décor, on la laisse s'en dégager :
    // seul le décor lui-même reste infranchissable, sinon elle serait bloquée à vie
    const stuck = pointInRect(from, big);
    if (pointInRect(to, stuck ? rect : big)) return { ok: false, why: 'le socle ne rentre pas', d };
    if (!stuck && segRectT(from, to, big) !== null) return { ok: false, why: 'décor sur le trajet', d };
  }
  for (const o of models) {
    if (o === m || !o.alive) continue;
    if (dist(o, to) < o.r + m.r) return { ok: false, why: 'place occupée', d };
  }
  return { ok: true, d };
}
