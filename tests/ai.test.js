import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide, decideMelee } from '../src/ai/decide.js';
import { createMelee } from '../src/rules/combat.js';

// figurine IA (camp B) et cible ennemie (camp A), champs minimaux lus par les règles
const ai = (o = {}) => ({ team: 'B', alive: true, activated: false, ap: 2, shot: false, aimed: false, moved: false,
  hp: 8, w: 8, r: 0.62, M: 6, x: 0, y: 5, weapon: { a: 4, bs: 3 }, meleeWeapon: { a: 4, ws: 3 }, ...o });
const foe = (o = {}) => ({ team: 'A', alive: true, hp: 12, w: 12, r: 0.62, x: 10, y: 5, ...o });
const st = (models, terrain = []) => ({ models, terrain });

test('une cible au contact déclenche le corps à corps', () => {
  const m = ai(), e = foe({ x: 1.5, y: 5 }); // 1.5″ ≤ portée de contrôle
  assert.equal(decide(st([m, e]), 'B').type, 'fight');
});

test('face à une cible tirable, l\'IA vise d\'abord si elle a deux PA', () => {
  const it = decide(st([ai(), foe({ x: 10, y: 5 })]), 'B');
  assert.equal(it.type, 'aim');
});

test('une fois en joue, l\'IA tire', () => {
  const it = decide(st([ai({ aimed: true }), foe({ x: 10, y: 5 })]), 'B');
  assert.equal(it.type, 'shoot');
});

test('avec un seul PA restant, l\'IA tire sans viser', () => {
  const it = decide(st([ai({ ap: 1, moved: true }), foe({ x: 10, y: 5 })]), 'B');
  assert.equal(it.type, 'shoot');
});

test('sans cible atteignable, l\'IA se rapproche', () => {
  const m = ai({ weapon: { a: 4, bs: 3, range: 4 } }), e = foe({ x: 12, y: 5 }); // hors portée et hors contact
  const it = decide(st([m, e]), 'B');
  assert.equal(it.type, 'move');
  assert.ok(it.dest);
});

test('sans PA, l\'IA termine l\'activation', () => {
  assert.equal(decide(st([ai({ ap: 0 }), foe()]), 'B').type, 'end');
});

test('sans ennemi vivant, l\'IA termine l\'activation', () => {
  assert.equal(decide(st([ai()]), 'B').type, 'end');
});

const meleeState = (o) => createMelee({
  atkWeapon: { ws: 3, dn: 3, dc: 4 }, defWeapon: { ws: 3, dn: 3, dc: 5 }, atkHp: 12, defHp: 8, ...o,
});

test('en duel, l\'IA frappe quand il lui reste des réussites', () => {
  const a = decideMelee(meleeState({ atkRolls: [4], defRolls: [1] }));
  assert.equal(a.kind, 'strike');
});

test('en duel, l\'IA frappe avec ses critiques d\'abord', () => {
  const a = decideMelee(meleeState({ atkRolls: [6, 4], defRolls: [1] }));
  assert.equal(a.kind, 'strike');
  assert.equal(a.die, 'crit');
});

test('en duel, l\'IA contre une critique adverse létale si elle le peut', () => {
  // attaquant à 4 PV, défenseur a une critique (dc 5 ≥ 4) et l\'attaquant une critique pour parer
  const a = decideMelee(meleeState({ atkRolls: [6], defRolls: [6], atkHp: 4 }));
  assert.equal(a.kind, 'parry');
  assert.equal(a.target, 'crit');
});
