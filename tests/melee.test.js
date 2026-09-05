import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyMelee, createMelee, meleeOptions, applyMeleeAction } from '../src/rules/combat.js';

// armes types : couteau (T3, 3/4) pour l'attaquant, machette (T3, 3/5) pour le défenseur
const knife = { ws: 3, dn: 3, dc: 4 };
const club = { ws: 3, dn: 3, dc: 5 };
const duel = (o = {}) => createMelee({
  atkRolls: [], defRolls: [], atkWeapon: knife, defWeapon: club, atkHp: 12, defHp: 8, ...o,
});

test('un 6 est critique et un 1 un échec, quelle que soit la valeur Touche', () => {
  assert.deepEqual(classifyMelee([6, 1], 2), { hits: 0, crits: 1 });
  assert.deepEqual(classifyMelee([6, 1], 5), { hits: 0, crits: 1 });
});

test('les dés au-dessus du seuil comptent comme touches normales', () => {
  assert.deepEqual(classifyMelee([3, 4, 5, 2], 3), { hits: 3, crits: 0 });
});

test('l\'attaquant résout le premier dé', () => {
  const d = duel({ atkRolls: [4], defRolls: [4] });
  assert.equal(d.turn, 'atk');
});

test('faute de réussite chez l\'attaquant, le défenseur résout les siennes', () => {
  const d = duel({ atkRolls: [1, 1], defRolls: [4] });
  assert.equal(d.turn, 'def');
});

test('aucune réussite des deux côtés termine le duel sans dégât', () => {
  const d = duel({ atkRolls: [1], defRolls: [2] }); // 2 < ws 3
  assert.equal(d.done, true);
  assert.equal(d.dead, null);
});

test('frapper avec une touche normale inflige les dégâts normaux', () => {
  let d = duel({ atkRolls: [4], defRolls: [1] });
  d = applyMeleeAction(d, { kind: 'strike', die: 'hit' });
  assert.equal(d.def.hp, 5); // 8 - 3
});

test('frapper avec une critique inflige les dégâts critiques', () => {
  let d = duel({ atkRolls: [6], defRolls: [1] });
  d = applyMeleeAction(d, { kind: 'strike', die: 'crit' });
  assert.equal(d.def.hp, 4); // 8 - 4 (dc du couteau)
});

test('la main alterne entre attaquant et défenseur', () => {
  let d = duel({ atkRolls: [4], defRolls: [4] });
  d = applyMeleeAction(d, { kind: 'strike', die: 'hit' });
  assert.equal(d.turn, 'def'); // au défenseur ensuite
});

test('quand un camp n\'a plus de dé, l\'autre résout les siens d\'affilée', () => {
  let d = duel({ atkRolls: [4, 4], defRolls: [1] }); // le défenseur n'a aucune réussite
  d = applyMeleeAction(d, { kind: 'strike', die: 'hit' });
  assert.equal(d.turn, 'atk'); // reste à l'attaquant
  assert.equal(d.done, false);
});

test('contrer avec une normale défausse une réussite normale adverse', () => {
  let d = duel({ atkRolls: [4], defRolls: [4] });
  d = applyMeleeAction(d, { kind: 'parry', die: 'hit', target: 'hit' });
  assert.equal(d.def.hits, 0); // le dé adverse est défaussé
  assert.equal(d.done, true);  // plus aucun dé
});

test('une critique peut contrer une critique adverse', () => {
  const d = duel({ atkRolls: [6], defRolls: [6] });
  const opts = meleeOptions(d);
  assert.ok(opts.some(o => o.kind === 'parry' && o.die === 'crit' && o.target === 'crit'));
});

test('une critique peut aussi contrer une réussite normale', () => {
  const d = duel({ atkRolls: [6], defRolls: [4] });
  const opts = meleeOptions(d);
  assert.ok(opts.some(o => o.kind === 'parry' && o.die === 'crit' && o.target === 'hit'));
});

test('une normale seule ne peut pas contrer une critique', () => {
  const d = duel({ atkRolls: [4], defRolls: [6] }); // l'attaquant n'a qu'une normale, le défenseur une critique
  const opts = meleeOptions(d);
  assert.ok(!opts.some(o => o.kind === 'parry' && o.target === 'crit'));
});

test('une figurine tombée à 0 PV meurt et le duel s\'arrête, dés restants écartés', () => {
  let d = duel({ atkRolls: [6, 6], defRolls: [4], defHp: 4 }); // 4 PV, un critique à 4 dégâts suffit
  d = applyMeleeAction(d, { kind: 'strike', die: 'crit' });
  assert.equal(d.def.hp, 0);
  assert.equal(d.dead, 'def');
  assert.equal(d.done, true);
  assert.equal(meleeOptions(d).length, 0); // le second critique de l'attaquant est écarté
});
