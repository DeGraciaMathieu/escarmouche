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

// ============================================================
//  Corps à corps — duel alterné frapper / contrer (façon Kill Team)
// ============================================================

// Classe les dés de mêlée d'un camp en touches normales et critiques (les échecs sont écartés).
export const classifyMelee = (rolls, ws) => ({
  hits: rolls.filter(v => isHit(v, ws)).length,
  crits: rolls.filter(isCrit).length,
});

const hasDice = s => s.hits + s.crits > 0;

// Fabrique l'état initial d'un duel à partir des deux lots de dés lancés. L'attaquant résout
// en premier ; si un camp n'a aucune réussite, l'autre résout les siennes.
export function createMelee({ atkRolls, defRolls, atkWeapon, defWeapon, atkHp, defHp }) {
  const atk = { ...classifyMelee(atkRolls, atkWeapon.ws), dn: atkWeapon.dn, dc: atkWeapon.dc, hp: atkHp };
  const def = { ...classifyMelee(defRolls, defWeapon.ws), dn: defWeapon.dn, dc: defWeapon.dc, hp: defHp };
  const turn = hasDice(atk) ? 'atk' : hasDice(def) ? 'def' : null;
  return { turn, done: turn === null, dead: null, atk, def };
}

// Actions légales du camp dont c'est le tour : frapper avec l'un de ses dés, ou contrer un dé
// adverse. Une normale ne défausse qu'une normale adverse ; une critique défausse n'importe
// quel dé adverse — seule une critique bloque une critique.
export function meleeOptions(duel) {
  if (duel.done || !duel.turn) return [];
  const me = duel[duel.turn], foe = duel[duel.turn === 'atk' ? 'def' : 'atk'];
  const opts = [];
  for (const die of ['crit', 'hit']) {
    if ((die === 'crit' ? me.crits : me.hits) <= 0) continue;
    opts.push({ kind: 'strike', die });
    if (die === 'crit' && foe.crits > 0) opts.push({ kind: 'parry', die, target: 'crit' });
    if (foe.hits > 0) opts.push({ kind: 'parry', die, target: 'hit' });
  }
  return opts;
}

// Applique une action et rend un nouvel état (sans muter l'argument). Frapper inflige les
// dégâts du dé (dn/dc de l'arme du frappeur) ; contrer défausse une réussite adverse. Une mort
// (0 PV) arrête le duel ; sinon la main passe à l'adversaire s'il lui reste des dés, faute de
// quoi le camp courant résout les siens.
export function applyMeleeAction(duel, action) {
  const side = duel.turn, foeSide = side === 'atk' ? 'def' : 'atk';
  const me = { ...duel[side] }, foe = { ...duel[foeSide] };
  if (action.die === 'crit') me.crits--; else me.hits--;
  let dead = duel.dead;
  if (action.kind === 'strike') {
    foe.hp = Math.max(0, foe.hp - (action.die === 'crit' ? me.dc : me.dn));
    if (foe.hp <= 0) dead = foeSide;
  } else if (action.target === 'crit') foe.crits--; else foe.hits--;

  const next = { ...duel, [side]: me, [foeSide]: foe, dead };
  if (dead) { next.done = true; return next; }
  const other = hasDice(foe) ? foeSide : hasDice(me) ? side : null;
  next.turn = other; next.done = other === null;
  return next;
}
