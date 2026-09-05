import { CRIT_VALUE, MIN_HIT_TARGET } from '../config.js';

// Classement d'un dé (un 1 ne touche/sauve jamais ; un 6 est toujours critique).
export const isCrit = v => v === CRIT_VALUE;
export const isHit = (v, bs) => v !== CRIT_VALUE && v >= bs && v > 1;
export const isSave = (v, sv) => v !== CRIT_VALUE && v >= sv && v > 1;

// Seuil de touche effectif : viser abaisse le seuil d'un cran, sans descendre sous 2+.
export const effectiveBs = (bs, aimed) => Math.max(MIN_HIT_TARGET, aimed ? bs - 1 : bs);

// Résout un tir à partir des dés lancés :
// une sauvegarde annule une touche, deux sauvegardes (ou une sauvegarde critique) annulent
// une critique ; le couvert offre une sauvegarde supplémentaire.
export function resolveShot({ atkRolls, defRolls, bs, sv, cover, dn, dc }) {
  const crits = atkRolls.filter(isCrit).length;
  const hits = atkRolls.filter(v => isHit(v, bs)).length;
  const csaves = defRolls.filter(isCrit).length;
  const saves = defRolls.filter(v => isSave(v, sv)).length + (cover ? 1 : 0);

  const critCancelledByCrit = Math.min(csaves, crits);          // une sauvegarde critique annule une critique
  let rc = crits - critCancelledByCrit;
  let ns = saves + (csaves - critCancelledByCrit);              // les sauvegardes critiques en trop valent des sauvegardes normales
  const critCancelledByPair = Math.min(rc, Math.floor(ns / 2)); // deux sauvegardes normales annulent une critique
  rc -= critCancelledByPair;
  ns -= critCancelledByPair * 2;
  const hitCancelled = Math.min(hits, ns);                      // une sauvegarde annule une touche
  const rh = hits - hitCancelled;

  return {
    crits, hits, csaves, saves,
    critCancelledByCrit, critCancelledByPair, hitCancelled,
    survivingCrits: rc, survivingHits: rh,
    damage: rc * dc + rh * dn,
  };
}
