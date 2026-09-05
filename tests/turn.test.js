import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideActivationEnd, engagedModel, canAct, annihilationWinner, attritionWinner } from '../src/rules/turn.js';

const m = (team, o = {}) => ({ team, alive: true, activated: false, ap: 2, hp: 10, ...o });

test('une figurine entamée mais pas terminée reste engagée : on ne peut pas en activer une autre', () => {
  const entamee = m('A', { activated: true, ap: 1 });
  const models = [entamee, m('A'), m('B')];
  assert.equal(engagedModel(models, 'A'), entamee);
});

test('une figurine aux points épuisés n\'est plus engagée : la main peut passer', () => {
  const models = [m('A', { activated: true, ap: 0 }), m('B')];
  assert.equal(engagedModel(models, 'A'), null);
});

test('une figurine qui a déjà bougé mais garde un PA peut encore agir (2 actions par activation)', () => {
  const bougee = m('A', { activated: true, moved: true, ap: 1 }); // a dépensé 1 PA sur un déplacement
  assert.equal(canAct(bougee, [bougee, m('B')], 'A'), true); // régression : rebouger reste permis
});

test('une figurine sans PA ne peut plus agir', () => {
  const finie = m('A', { activated: true, ap: 0 });
  assert.equal(canAct(finie, [finie, m('B')], 'A'), false);
});

test('on ne peut pas agir avec une figurine tant qu\'une autre est engagée, mais l\'engagée oui', () => {
  const engagee = m('A', { activated: true, ap: 1 });
  const autre = m('A');
  const models = [engagee, autre, m('B')];
  assert.equal(canAct(autre, models, 'A'), false);   // bloquée par l'activation en cours
  assert.equal(canAct(engagee, models, 'A'), true);  // l'engagée peut poursuivre
});

test('on ne peut pas agir avec une figurine du camp adverse ou morte', () => {
  const ennemie = m('B', { ap: 2 }), morte = m('A', { alive: false });
  assert.equal(canAct(ennemie, [ennemie], 'A'), false);
  assert.equal(canAct(morte, [morte], 'A'), false);
});

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
