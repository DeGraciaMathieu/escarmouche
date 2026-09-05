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

// Peut-on prendre cette figurine pour cible, indépendamment de l'arme choisie :
// camp adverse, points d'action, tir déjà fait, ligne de vue dégagée. La portée et
// l'arme lourde dépendent de l'arme et sont jugées par weaponCanFire.
export function canTarget(m, target, terrain) {
  if (!m || !target || !target.alive || !m.alive) return { ok: false, why: '—' };
  if (m.team === target.team) return { ok: false, why: '—' };
  if (m.ap < 1) return { ok: false, why: "plus de point d'action" };
  if (m.shot) return { ok: false, why: 'a déjà tiré ce tour' };
  const s = sight(m, target, terrain);
  if (!s.los) return { ok: false, why: 'ligne de vue bloquée', s };
  return { ok: true, s };
}

// Une arme peut-elle faire feu sur une cible déjà en ligne de vue (s) :
// une arme lourde ne tire pas après un déplacement, une arme à portée limitée ne
// tire pas au-delà de sa portée.
export function weaponCanFire(weapon, moved, s) {
  if (weapon.heavy && moved) return { ok: false, why: 'arme lourde : elle a bougé' };
  if (weapon.range && s.len > weapon.range) return { ok: false, why: `hors de portée (${weapon.range}″)` };
  return { ok: true };
}

// Détermine si m peut tirer sur target avec son arme équipée.
export function canShoot(m, target, terrain) {
  const t = canTarget(m, target, terrain);
  if (!t.ok) return t;
  const w = weaponCanFire(m.weapon, m.moved, t.s);
  return w.ok ? { ok: true, s: t.s } : { ok: false, why: w.why, s: t.s };
}
