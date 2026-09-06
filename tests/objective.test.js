import { test } from 'node:test';
import assert from 'node:assert/strict';
import { controlOf, scoreObjectives } from '../src/rules/objective.js';

const at = (team, x, y, o = {}) => ({ team, x, y, alive: true, ...o });
const O = { x: 10, y: 10 };

test('le camp le plus nombreux à portée contrôle l\'objectif', () => {
  const models = [at('A', 10, 10), at('A', 11, 10), at('B', 9, 10)];
  assert.equal(controlOf(models, O, 3), 'A');
});

test('à égalité de figurines à portée, l\'objectif est disputé (personne)', () => {
  const models = [at('A', 10, 10), at('B', 9, 10)];
  assert.equal(controlOf(models, O, 3), null);
});

test('une figurine hors de portée ne compte pas', () => {
  const models = [at('A', 10, 10), at('B', 10, 20)]; // B est à 10″, hors de portée 3″
  assert.equal(controlOf(models, O, 3), 'A');
});

test('une figurine hors de combat ne contrôle rien', () => {
  const models = [at('A', 10, 10, { alive: false }), at('B', 10, 11)];
  assert.equal(controlOf(models, O, 3), 'B');
});

test('sans personne à portée, l\'objectif n\'est contrôlé par personne', () => {
  assert.equal(controlOf([at('A', 0, 0)], O, 3), null);
});

test('le décompte additionne les objectifs contrôlés par chaque camp', () => {
  const objectives = [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 40, y: 0 }];
  const models = [
    at('A', 0, 0), at('A', 1, 0),          // A tient le 1er
    at('B', 20, 0),                        // B tient le 2e
    at('A', 40, 0), at('B', 41, 0),        // 3e disputé
  ];
  assert.deepEqual(scoreObjectives(models, objectives, 3), { A: 1, B: 1 });
});
