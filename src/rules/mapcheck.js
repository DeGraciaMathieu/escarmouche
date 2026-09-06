import { BW, BH, BASE_RADIUS, TERRAIN_MARGIN_FACTOR, OBJECTIVE_RANGE } from '../config.js';
import { inflate, pointInRect } from './geometry.js';
import { findPath } from './pathfind.js';

const R = BASE_RADIUS;

// Vérifie qu'une map est jouable. Pure : mêmes entrées → mêmes issues. `spawns`/`objectives` sont
// des points {x, y} (les spawns portent un `name` optionnel). Deux exigences distinctes :
//  - un spawn accueille une figurine dès le départ → son point exact doit être dégagé ;
//  - un objectif se contrôle à distance (OBJECTIVE_RANGE) → il suffit qu'une position dégagée
//    existe à portée. Enfin, tous ces points doivent être mutuellement accessibles (décor contourné).
export function checkMap(terrain, spawns, objectives) {
  const issues = [];
  const infl = terrain.map(r => inflate(r, R * TERRAIN_MARGIN_FACTOR));
  const onBoard = p => p.x >= R && p.y >= R && p.x <= BW - R && p.y <= BH - R;
  const free = p => onBoard(p) && !infl.some(b => pointInRect(p, b));
  // Position dégagée la plus proche de `p` dans un rayon `rad` (p lui-même si libre), sinon null.
  const freeNear = (p, rad) => {
    if (free(p)) return p;
    for (let r = 0.4; r <= rad; r += 0.4)
      for (let a = 0; a < 16; a++) {
        const q = { x: p.x + r * Math.cos(a * Math.PI / 8), y: p.y + r * Math.sin(a * Math.PI / 8) };
        if (free(q)) return q;
      }
    return null;
  };

  const anchors = [];
  spawns.forEach((s, i) => {
    const label = s.name ? `spawn ${s.name}` : `spawn #${i + 1}`;
    if (!onBoard(s)) issues.push(`${label} hors plateau`);
    else if (!free(s)) issues.push(`${label} dans un décor`);
    else anchors.push({ p: s, label });
  });
  objectives.forEach((o, i) => {
    const label = `objectif #${i + 1}`;
    const near = onBoard(o) ? freeNear(o, OBJECTIVE_RANGE) : null;
    if (!near) issues.push(`${label} enfermé (aucune position à portée)`);
    else anchors.push({ p: near, label });
  });

  if (anchors.length > 1) {
    const root = anchors[0].p;
    for (let i = 1; i < anchors.length; i++)
      if (!findPath(root, anchors[i].p, infl)) issues.push(`${anchors[i].label} inaccessible (décor bloquant)`);
  }
  return { ok: issues.length === 0, issues };
}
