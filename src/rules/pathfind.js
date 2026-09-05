import { PATH_CORNER_OFFSET } from '../config.js';
import { dist, pointInRect, segRectT } from './geometry.js';

// Coins d'un rectangle poussés vers l'extérieur, pour qu'un segment les frôle sans être
// considéré comme traversant le décor.
function cornersOf(r) {
  const e = PATH_CORNER_OFFSET;
  return [
    { x: r.x - e, y: r.y - e },
    { x: r.x + r.w + e, y: r.y - e },
    { x: r.x + r.w + e, y: r.y + r.h + e },
    { x: r.x - e, y: r.y + r.h + e },
  ];
}

// Vrai si le segment p→q traverse l'intérieur d'un des décors.
function blocked(p, q, rects) {
  for (const r of rects) if (segRectT(p, q, r) !== null) return true;
  return false;
}

// Plus court chemin de `from` à `to` contournant les décors (déjà inflatés), ou null si aucun
// chemin n'existe. Graphe de visibilité : nœuds = départ, arrivée et coins des décors ; arêtes
// entre nœuds mutuellement visibles ; plus court chemin (Dijkstra).
export function findPath(from, to, rects) {
  if (!blocked(from, to, rects)) return [from, to];
  const nodes = [from, to];
  for (const r of rects)
    for (const c of cornersOf(r))
      if (!rects.some(o => pointInRect(c, o))) nodes.push(c);

  const n = nodes.length;
  const best = new Array(n).fill(Infinity), prev = new Array(n).fill(-1), done = new Array(n).fill(false);
  best[0] = 0;
  for (let it = 0; it < n; it++) {
    let u = -1, min = Infinity;
    for (let i = 0; i < n; i++) if (!done[i] && best[i] < min) { min = best[i]; u = i; }
    if (u === -1 || u === 1) break;
    done[u] = true;
    for (let v = 0; v < n; v++) {
      if (done[v] || blocked(nodes[u], nodes[v], rects)) continue;
      const nd = best[u] + dist(nodes[u], nodes[v]);
      if (nd < best[v]) { best[v] = nd; prev[v] = u; }
    }
  }
  if (best[1] === Infinity) return null;
  const path = [];
  for (let i = 1; i !== -1; i = prev[i]) path.unshift(nodes[i]);
  return path;
}
