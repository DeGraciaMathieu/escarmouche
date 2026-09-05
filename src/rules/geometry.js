import { SEGMENT_PARALLEL_EPSILON } from '../config.js';

// Distance euclidienne entre deux positions.
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Agrandit un rectangle de décor d'une marge m sur chaque côté.
export const inflate = (r, m) => ({ x: r.x - m, y: r.y - m, w: r.w + 2 * m, h: r.h + 2 * m, t: r.t });

// Vrai si le point p est à l'intérieur du rectangle r.
export const pointInRect = (p, r) =>
  p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

// Paramètre t (0..1) du point d'intersection du segment p1→p2 avec p3→p4, ou null.
export function segSegT(p1, p2, p3, p4) {
  const d1x = p2.x - p1.x, d1y = p2.y - p1.y, d2x = p4.x - p3.x, d2y = p4.y - p3.y;
  const den = d1x * d2y - d1y * d2x;
  if (Math.abs(den) < SEGMENT_PARALLEL_EPSILON) return null;
  const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / den,
        u = ((p3.x - p1.x) * d1y - (p3.y - p1.y) * d1x) / den;
  return (t < 0 || t > 1 || u < 0 || u > 1) ? null : t;
}

// Distance du point p au rectangle r (0 si p est à l'intérieur).
export function distPointRect(p, r) {
  const dx = Math.max(r.x - p.x, 0, p.x - (r.x + r.w));
  const dy = Math.max(r.y - p.y, 0, p.y - (r.y + r.h));
  return Math.hypot(dx, dy);
}

// Paramètre t (0..1) du premier point où le segment p1→p2 rencontre le rectangle r, ou null.
export function segRectT(p1, p2, r) {
  if (pointInRect(p1, r)) return 0;
  const c = [{ x: r.x, y: r.y }, { x: r.x + r.w, y: r.y }, { x: r.x + r.w, y: r.y + r.h }, { x: r.x, y: r.y + r.h }];
  let best = null;
  for (let i = 0; i < 4; i++) {
    const t = segSegT(p1, p2, c[i], c[(i + 1) % 4]);
    if (t !== null && (best === null || t < best)) best = t;
  }
  if (best === null && pointInRect(p2, r)) return 1;
  return best;
}
