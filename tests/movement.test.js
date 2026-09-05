import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moveCheck } from '../src/rules/movement.js';

const unit = (o = {}) => ({ r: 0.62, M: 5, alive: true, x: 5, y: 5, ...o });

test('un déplacement plus long que le mouvement est refusé', () => {
  const m = unit({ M: 5, x: 5, y: 5 });
  assert.equal(moveCheck(m, { x: 15, y: 5 }, [m], []).ok, false); // 10″ > 5″
});

test('un déplacement dans la portée sur terrain vide est accepté', () => {
  const m = unit({ M: 5, x: 5, y: 5 });
  assert.equal(moveCheck(m, { x: 8, y: 5 }, [m], []).ok, true);
});

test('on ne peut pas se déplacer sur une case occupée', () => {
  const m = unit({ M: 5, x: 5, y: 5 });
  const other = unit({ x: 7, y: 5 });
  assert.equal(moveCheck(m, { x: 7, y: 5 }, [m, other], []).ok, false);
});

test('un décor sur le trajet bloque le déplacement', () => {
  const m = unit({ M: 8, x: 1, y: 5 });
  const wall = [{ x: 4, y: 0, w: 1, h: 10, t: 'wall' }];
  assert.equal(moveCheck(m, { x: 8, y: 5 }, [m], wall).ok, false);
});
