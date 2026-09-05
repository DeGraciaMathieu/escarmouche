import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideActivationEnd, annihilationWinner, attritionWinner } from '../src/rules/turn.js';

const m = (team, o = {}) => ({ team, alive: true, activated: false, hp: 10, ...o });

test('quand l\'adverse a encore des figurines, la main passe à l\'autre camp', () => {
  const models = [m('A', { activated: true }), m('B')];
  assert.deepEqual(decideActivationEnd(models, 'A'), { type: 'switch', side: 'B' });
});

test('quand plus personne n\'a à jouer, un nouveau tour commence', () => {
  const models = [m('A', { activated: true }), m('B', { activated: true })];
  assert.deepEqual(decideActivationEnd(models, 'A'), { type: 'newTurn' });
});

test('quand l\'adverse a fini mais pas nous, on enchaîne', () => {
  const models = [m('A'), m('B', { activated: true })];
  assert.deepEqual(decideActivationEnd(models, 'A'), { type: 'continue' });
});

test('une escouade anéantie donne la victoire à l\'autre', () => {
  const models = [m('A', { alive: false }), m('B')];
  assert.equal(annihilationWinner(models), 'B');
});

test('à la fin de la partie, l\'escouade la plus nombreuse l\'emporte', () => {
  const models = [m('A'), m('A'), m('B')];
  assert.equal(attritionWinner(models), 'A');
});

test('à égalité de figurines, le plus de PV cumulés l\'emporte', () => {
  const models = [m('A', { hp: 12 }), m('B', { hp: 5 })];
  assert.equal(attritionWinner(models), 'A');
});

test('même nombre de figurines et mêmes PV donnent un match nul', () => {
  const models = [m('A', { hp: 10 }), m('B', { hp: 10 })];
  assert.equal(attritionWinner(models), null);
});
