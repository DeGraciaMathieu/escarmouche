import { COVER_MIN_DISTANCE, COVER_TARGET_DISTANCE, MASK_MIN_DISTANCE, CONTROL_RANGE } from '../config.js';
import { dist, segRectT, distPointRect } from './geometry.js';

// Ligne de vue de a vers b à travers le décor. Un mur la bloque. Un décor bas traversé produit,
// selon sa position, l'un de deux effets (exclusifs, le couvert primant) :
// - couvert : à plus de COVER_MIN_DISTANCE du tireur ET à moins de COVER_TARGET_DISTANCE de la
//   cible (elle s'abrite) → +1 sauvegarde ;
// - masquage : à plus de MASK_MIN_DISTANCE de CHACUNE des deux unités (obstacle au milieu de la
//   ligne) → l'attaquant retire une réussite.
export function sight(a, b, terrain) {
  const p1 = { x: a.x, y: a.y }, p2 = { x: b.x, y: b.y }, len = dist(p1, p2);
  let cover = false, masked = false;
  for (const rect of terrain) {
    const t = segRectT(p1, p2, rect);
    if (t === null) continue;
    if (rect.t === 'wall') return { los: false, cover: false, masked: false, len };
    if (t * len > COVER_MIN_DISTANCE && distPointRect(p2, rect) < COVER_TARGET_DISTANCE) cover = true;
    else if (distPointRect(p1, rect) > MASK_MIN_DISTANCE && distPointRect(p2, rect) > MASK_MIN_DISTANCE) masked = true;
  }
  if (cover) masked = false;                    // exclusifs : le couvert prime sur le masquage
  return { los: true, cover, masked, len };
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

// Deux figurines sont au contact si elles sont à portée de contrôle l'une de l'autre.
export const inControlRange = (a, b) => dist(a, b) <= CONTROL_RANGE;

// Détermine si m peut engager target au corps à corps : cible adverse en vue (comme au tir),
// à portée de contrôle, l'attaquant devant posséder une arme de mêlée.
export function canFight(m, target, terrain) {
  const t = canTarget(m, target, terrain);
  if (!t.ok) return t;
  if (!m.meleeWeapon) return { ok: false, why: "pas d'arme de mêlée", s: t.s };
  if (!inControlRange(m, target)) return { ok: false, why: `hors de portée de contrôle (${CONTROL_RANGE}″)`, s: t.s };
  return { ok: true, s: t.s };
}
