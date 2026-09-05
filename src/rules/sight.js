import { COVER_MIN_DISTANCE } from '../config.js';
import { dist, segRectT } from './geometry.js';

// Ligne de vue de a vers b à travers le décor :
// un mur la bloque ; un décor bas au-delà de COVER_MIN_DISTANCE donne le couvert.
export function sight(a, b, terrain) {
  const p1 = { x: a.x, y: a.y }, p2 = { x: b.x, y: b.y }, len = dist(p1, p2);
  let cover = false;
  for (const rect of terrain) {
    const t = segRectT(p1, p2, rect);
    if (t === null) continue;
    if (rect.t === 'wall') return { los: false, cover: false, len };
    if (t * len > COVER_MIN_DISTANCE) cover = true;
  }
  return { los: true, cover, len };
}

// Détermine si m peut tirer sur target et pourquoi non le cas échéant.
export function canShoot(m, target, terrain) {
  if (!m || !target || !target.alive || !m.alive) return { ok: false, why: '—' };
  if (m.team === target.team) return { ok: false, why: '—' };
  if (m.ap < 1) return { ok: false, why: "plus de point d'action" };
  if (m.shot) return { ok: false, why: 'a déjà tiré ce tour' };
  if (m.weapon.heavy && m.moved) return { ok: false, why: 'arme lourde : elle a bougé' };
  const s = sight(m, target, terrain);
  if (!s.los) return { ok: false, why: 'ligne de vue bloquée', s };
  if (m.weapon.range && s.len > m.weapon.range) return { ok: false, why: `hors de portée (${m.weapon.range}″)`, s };
  return { ok: true, s };
}
