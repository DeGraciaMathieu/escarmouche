import { test } from 'node:test';
import assert from 'node:assert/strict';
import { effectiveBs, resolveShot, resolveOverheat, attackDice, defenseDice } from '../src/rules/combat.js';

// arme type : dn=3 dégâts par touche, dc=4 si critique
const shot = (o) => resolveShot({ bs: 3, sv: 4, cover: false, dn: 3, dc: 4, ...o });

test('viser abaisse le seuil de touche d\'un cran, sans descendre sous 2+', () => {
  assert.equal(effectiveBs(3, true), 2);
  assert.equal(effectiveBs(2, true), 2); // plancher à 2
  assert.equal(effectiveBs(3, false), 3);
});

test('une touche non sauvegardée inflige les dégâts de l\'arme', () => {
  const r = shot({ atkRolls: [5], defRolls: [1, 1, 1] }); // 1 touche, 0 sauvegarde
  assert.equal(r.damage, 3);
});

test('une sauvegarde annule une touche', () => {
  const r = shot({ atkRolls: [5], defRolls: [5, 1, 1] }); // 1 touche, 1 sauvegarde (4+)
  assert.equal(r.survivingHits, 0);
  assert.equal(r.damage, 0);
});

test('il faut deux sauvegardes normales pour annuler une critique', () => {
  const r = shot({ atkRolls: [6], defRolls: [4, 4, 1] }); // 1 critique, 2 sauvegardes
  assert.equal(r.survivingCrits, 0);
  assert.equal(r.damage, 0);
});

test('une seule sauvegarde ne suffit pas contre une critique', () => {
  const r = shot({ atkRolls: [6], defRolls: [4, 1, 1] }); // 1 critique, 1 sauvegarde
  assert.equal(r.survivingCrits, 1);
  assert.equal(r.damage, 4); // dégâts critiques
});

test('une sauvegarde critique annule une critique à elle seule', () => {
  const r = shot({ atkRolls: [6], defRolls: [6, 1, 1] }); // 1 critique attaque, 1 sauvegarde critique
  assert.equal(r.survivingCrits, 0);
  assert.equal(r.damage, 0);
});

test('une sauvegarde critique en surplus vaut une sauvegarde normale', () => {
  const r = shot({ atkRolls: [6, 5], defRolls: [6, 6, 1] }); // 1 crit + 1 touche, 2 sauvegardes critiques
  assert.equal(r.survivingCrits, 0); // une save crit annule la critique
  assert.equal(r.survivingHits, 0); // la save crit en trop annule la touche
  assert.equal(r.damage, 0);
});

test('le couvert ajoute une sauvegarde', () => {
  const withCover = shot({ atkRolls: [5], defRolls: [1, 1, 1], cover: true }); // couvert = 1 sauvegarde
  assert.equal(withCover.damage, 0);
  const without = shot({ atkRolls: [5], defRolls: [1, 1, 1], cover: false });
  assert.equal(without.damage, 3);
});

test('le masquage retire une touche simple à l\'attaquant', () => {
  const masked = shot({ atkRolls: [5, 5], defRolls: [1, 1, 1], masked: true }); // 2 touches → 1 retirée
  assert.equal(masked.hits, 1);
  assert.equal(masked.damage, 3);
  const clear = shot({ atkRolls: [5, 5], defRolls: [1, 1, 1] });               // sans masquage : 2 touches
  assert.equal(clear.damage, 6);
});

test('le masquage retire la touche simple avant la critique', () => {
  const r = shot({ atkRolls: [6, 5], defRolls: [1, 1, 1], masked: true }); // crit + touche → la touche saute
  assert.equal(r.survivingCrits, 1);
  assert.equal(r.survivingHits, 0);
  assert.equal(r.damage, 4);
});

test('le masquage ne retire une critique que faute de touche simple', () => {
  const r = shot({ atkRolls: [6], defRolls: [1, 1, 1], masked: true }); // aucune touche simple → la critique saute
  assert.equal(r.crits, 0);
  assert.equal(r.damage, 0);
});

test('un 1 ne touche jamais, même en visant', () => {
  const r = shot({ atkRolls: [1, 1], defRolls: [1, 1, 1], bs: 2 });
  assert.equal(r.hits, 0);
  assert.equal(r.crits, 0);
});

// --- Traits d'arme ---------------------------------------------------------

test('Létale x+ : un dé sous 6 mais ≥ x compte comme critique', () => {
  const r = shot({ atkRolls: [5, 4], defRolls: [1, 1, 1], critOn: 5 }); // 5 = crit, 4 = touche normale
  assert.equal(r.crits, 1);
  assert.equal(r.hits, 1);
  assert.equal(r.damage, 4 + 3);
});

test('Perforante x : le défenseur lance x dés de moins', () => {
  assert.equal(defenseDice({ a: 3 }), 3);
  assert.equal(defenseDice({ a: 3, ap: 1 }), 2);
  assert.equal(defenseDice({ a: 3, ap: 5 }), 0); // plancher 0
});

test('Brutale : les sauvegardes normales n\'annulent rien', () => {
  const r = shot({ atkRolls: [5], defRolls: [5, 5, 5], brutal: true }); // 3 saves normales ignorées
  assert.equal(r.survivingHits, 1);
  assert.equal(r.damage, 3);
});

test('Brutale : une sauvegarde critique bloque encore', () => {
  const r = shot({ atkRolls: [5], defRolls: [6, 1, 1], brutal: true }); // la save crit vaut save normale
  assert.equal(r.damage, 0);
});

test('Dévastatrice x : chaque crit inflige x dégâts inéluctables', () => {
  const r = shot({ atkRolls: [6], defRolls: [6, 6, 6], devastating: 3 }); // défense parfaite, mais inéluctable
  assert.equal(r.mortal, 3);
  assert.equal(r.survivingCrits, 0);
  assert.equal(r.damage, 3);
});

test('Précision x : x réussites normales automatiques', () => {
  const r = shot({ atkRolls: [1, 1], defRolls: [1, 1, 1], precision: 2 }); // aucun dé ne touche, +2 sûres
  assert.equal(r.hits, 2);
  assert.equal(r.damage, 6);
});

test('Précision : les dés lancés sont réduits d\'autant', () => {
  assert.equal(attackDice({ a: 6, precision: 1 }), 5);
  assert.equal(attackDice({ a: 4 }), 4);
});

test('Saturation : le couvert n\'ajoute pas de sauvegarde', () => {
  const r = shot({ atkRolls: [5], defRolls: [1, 1, 1], cover: true, saturate: true });
  assert.equal(r.damage, 3); // sans saturation, le dé de couvert annulerait la touche
});

test('une surchauffe (dé de surchauffe à 1) blesse le tireur', () => {
  assert.equal(resolveOverheat(1), 2);
});

test('tout autre résultat du dé de surchauffe est sans effet', () => {
  for (const v of [2, 3, 4, 5, 6]) assert.equal(resolveOverheat(v), 0);
});
