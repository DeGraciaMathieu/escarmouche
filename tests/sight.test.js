import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sight, canShoot } from '../src/rules/sight.js';

const shooter = (o = {}) => ({ team: 'A', alive: true, ap: 2, shot: false, moved: false, weapon: { a: 4, bs: 3 }, x: 0, y: 5, ...o });
const target = (o = {}) => ({ team: 'B', alive: true, x: 10, y: 5, ...o });

test('un mur sur la ligne bloque la vue', () => {
  const wall = [{ x: 4, y: 0, w: 2, h: 10, t: 'wall' }];
  assert.equal(sight({ x: 0, y: 5 }, { x: 10, y: 5 }, wall).los, false);
});

test('un décor bas traversé donne le couvert sans bloquer la vue', () => {
  const low = [{ x: 4, y: 0, w: 2, h: 10, t: 'low' }];
  const s = sight({ x: 0, y: 5 }, { x: 10, y: 5 }, low);
  assert.equal(s.los, true);
  assert.equal(s.cover, true);
});

test('en terrain dégagé la vue est libre et sans couvert', () => {
  const s = sight({ x: 0, y: 5 }, { x: 10, y: 5 }, []);
  assert.equal(s.los, true);
  assert.equal(s.cover, false);
});

test('on ne peut pas tirer au-delà de la portée de l\'arme', () => {
  const m = shooter({ weapon: { a: 4, bs: 3, range: 8 } });
  const chk = canShoot(m, target({ x: 10, y: 5 }), []); // distance 10 > portée 8
  assert.equal(chk.ok, false);
});

test('une arme lourde ne peut pas tirer après avoir bougé', () => {
  const m = shooter({ moved: true, weapon: { a: 4, bs: 2, heavy: true } });
  assert.equal(canShoot(m, target(), []).ok, false);
});
