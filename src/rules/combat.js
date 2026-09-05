import { CRIT_VALUE, MIN_HIT_TARGET, SAVES_PER_CRIT, OVERHEAT_ROLL, OVERHEAT_DAMAGE } from '../config.js';

// Classement d'un dé (un 1 ne touche/sauve jamais ; un 6 est toujours critique).
export const isCrit = v => v === CRIT_VALUE;
export const isHit = (v, bs) => v !== CRIT_VALUE && v >= bs && v > 1;
export const isSave = (v, sv) => v !== CRIT_VALUE && v >= sv && v > 1;

// Seuil de touche effectif : viser abaisse le seuil d'un cran, sans descendre sous 2+.
export const effectiveBs = (bs, aimed) => Math.max(MIN_HIT_TARGET, aimed ? bs - 1 : bs);

// Surchauffe (trait plasma) : sur le résultat OVERHEAT_ROLL, le tireur subit OVERHEAT_DAMAGE dégâts.
export const resolveOverheat = roll => roll === OVERHEAT_ROLL ? OVERHEAT_DAMAGE : 0;

// Résout un tir à partir des dés lancés :
// une sauvegarde annule une touche, deux sauvegardes (ou une sauvegarde critique) annulent
// une critique ; le couvert offre une sauvegarde supplémentaire ; le masquage fait retirer une
// réussite à l'attaquant (une touche simple d'abord, une critique seulement à défaut).
export function resolveShot({ atkRolls, defRolls, bs, sv, cover, masked, dn, dc }) {
  let crits = atkRolls.filter(isCrit).length;
  let hits = atkRolls.filter(v => isHit(v, bs)).length;
  if (masked) { if (hits > 0) hits--; else if (crits > 0) crits--; }
  const csaves = defRolls.filter(isCrit).length;
  const saves = defRolls.filter(v => isSave(v, sv)).length + (cover ? 1 : 0);

  const critCancelledByCrit = Math.min(csaves, crits);          // une sauvegarde critique annule une critique
  let rc = crits - critCancelledByCrit;
  let ns = saves + (csaves - critCancelledByCrit);              // les sauvegardes critiques en trop valent des sauvegardes normales
  const critCancelledByPair = Math.min(rc, Math.floor(ns / SAVES_PER_CRIT)); // deux sauvegardes normales annulent une critique
  rc -= critCancelledByPair;
  ns -= critCancelledByPair * SAVES_PER_CRIT;
  const hitCancelled = Math.min(hits, ns);                      // une sauvegarde annule une touche
  const rh = hits - hitCancelled;

  return {
    crits, hits, csaves, saves,
    critCancelledByCrit, critCancelledByPair, hitCancelled,
    survivingCrits: rc, survivingHits: rh,
    damage: rc * dc + rh * dn,
  };
}
