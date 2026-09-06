import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/rules/rng.js';

const take = (rng, n) => Array.from({ length: n }, () => rng());

test('une même graine produit toujours la même séquence (reproductibilité)', () => {
  assert.deepEqual(take(createRng(42), 5), take(createRng(42), 5));
});

test('deux graines différentes produisent des séquences différentes', () => {
  assert.notDeepEqual(take(createRng(1), 5), take(createRng(2), 5));
});

test('les valeurs restent dans [0, 1)', () => {
  const rng = createRng(7);
  for (let i = 0; i < 100; i++) {
    const v = rng();
    assert.ok(v >= 0 && v < 1, `valeur hors bornes : ${v}`);
  }
});
