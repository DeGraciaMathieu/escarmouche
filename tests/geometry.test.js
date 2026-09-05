import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dist, pointInRect, segRectT } from '../src/rules/geometry.js';

test('la distance entre deux points est euclidienne', () => {
  assert.equal(dist({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
});

test('un décor sur le trajet est détecté par le segment', () => {
  const wall = { x: 4, y: 0, w: 2, h: 10, t: 'wall' };
  // trajet horizontal qui traverse le mur
  assert.notEqual(segRectT({ x: 0, y: 5 }, { x: 10, y: 5 }, wall), null);
});

test('un trajet qui ne touche aucun décor rend null', () => {
  const wall = { x: 4, y: 0, w: 2, h: 2, t: 'wall' };
  // trajet horizontal bien en dessous du mur
  assert.equal(segRectT({ x: 0, y: 9 }, { x: 10, y: 9 }, wall), null);
});

test('un point à l\'intérieur du rectangle est reconnu', () => {
  const rect = { x: 0, y: 0, w: 4, h: 4 };
  assert.equal(pointInRect({ x: 2, y: 2 }, rect), true);
  assert.equal(pointInRect({ x: 5, y: 2 }, rect), false);
});
