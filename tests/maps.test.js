import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PIECES, place, MAPS } from '../src/state/game.js';
import { sight } from '../src/rules/sight.js';

const wellFormed = r =>
  Number.isFinite(r.x) && Number.isFinite(r.y) && Number.isFinite(r.w) && Number.isFinite(r.h) &&
  r.w > 0 && r.h > 0 && (r.t === 'wall' || r.t === 'low');

test('place() produit des rects bien formés portant le variant de la pièce', () => {
  for (const key of Object.keys(PIECES)) {
    const rects = place(key, 5, 7);
    assert.ok(rects.length >= 1, `${key} sans rect`);
    for (const r of rects) {
      assert.ok(wellFormed(r), `${key} rect mal formé`);
      assert.equal(r.variant, PIECES[key].variant);
    }
  }
});

test('chaque plan de MAPS a un terrain non vide de rects bien formés', () => {
  for (const [key, m] of Object.entries(MAPS)) {
    assert.ok(Array.isArray(m.terrain) && m.terrain.length > 0, `${key} sans terrain`);
    for (const r of m.terrain) assert.ok(wellFormed(r), `${key} rect mal formé`);
  }
});

test('le variant n\'altère pas la ligne de vue (inerte côté règles)', () => {
  const a = { x: 0, y: 5 }, b = { x: 10, y: 5 };
  const wall = { x: 4, y: 0, w: 2, h: 10, t: 'wall' };
  assert.equal(sight(a, b, [{ ...wall }]).los, false);
  assert.equal(sight(a, b, [{ ...wall, variant: 'container' }]).los, false); // même verdict
  const low = { x: 7, y: 0, w: 2, h: 10, t: 'low' };
  assert.equal(sight(a, b, [{ ...low }]).cover, sight(a, b, [{ ...low, variant: 'barricade' }]).cover);
});
