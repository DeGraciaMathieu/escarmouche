import { test } from 'node:test';
import assert from 'node:assert/strict';
import { awardKill, addObjectiveScore } from '../src/rules/score.js';

test('une élimination donne un point au camp responsable, jamais à la victime', () => {
  assert.deepEqual(awardKill({ A: 0, B: 0 }, 'A'), { A: 1, B: 0 });
  assert.deepEqual(awardKill({ A: 2, B: 3 }, 'B'), { A: 2, B: 4 });
});

test('créditer un kill ne mute pas le score d\'origine', () => {
  const score = { A: 0, B: 0 };
  awardKill(score, 'A');
  assert.deepEqual(score, { A: 0, B: 0 });
});

test('le décompte de fin de tour ajoute un point par objectif tenu de chaque camp', () => {
  assert.deepEqual(addObjectiveScore({ A: 0, B: 0 }, { A: 2, B: 1 }), { A: 2, B: 1 });
  assert.deepEqual(addObjectiveScore({ A: 5, B: 4 }, { A: 1, B: 3 }), { A: 6, B: 7 });
});

test('sans objectif tenu, le score n\'évolue pas', () => {
  assert.deepEqual(addObjectiveScore({ A: 3, B: 3 }, { A: 0, B: 0 }), { A: 3, B: 3 });
});
