import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aliveOf, remaining } from '../src/rules/squad.js';

const models = [
  { team: 'A', alive: true, activated: false },
  { team: 'A', alive: true, activated: true },
  { team: 'A', alive: false, activated: false },
  { team: 'B', alive: true, activated: false },
];

test('une escouade ne compte que ses figurines vivantes', () => {
  assert.equal(aliveOf(models, 'A').length, 2);
});

test('il reste à activer les figurines vivantes qui n\'ont pas encore joué', () => {
  assert.equal(remaining(models, 'A'), 1); // la vivante-activée et la morte ne comptent pas
  assert.equal(remaining(models, 'B'), 1);
});
