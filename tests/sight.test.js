import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sight, canShoot, canTarget, weaponCanFire } from '../src/rules/sight.js';

const shooter = (o = {}) => ({ team: 'A', alive: true, ap: 2, shot: false, moved: false, weapon: { a: 4, bs: 3 }, x: 0, y: 5, ...o });
const target = (o = {}) => ({ team: 'B', alive: true, x: 10, y: 5, ...o });

test('un mur sur la ligne bloque la vue', () => {
  const wall = [{ x: 4, y: 0, w: 2, h: 10, t: 'wall' }];
  assert.equal(sight({ x: 0, y: 5 }, { x: 10, y: 5 }, wall).los, false);
});

test('un décor bas traversé, proche de la cible, donne le couvert sans bloquer la vue', () => {
  const low = [{ x: 7, y: 0, w: 2, h: 10, t: 'low' }]; // cible en x=10 à 1″ du décor (< 3″)
  const s = sight({ x: 0, y: 5 }, { x: 10, y: 5 }, low);
  assert.equal(s.los, true);
  assert.equal(s.cover, true);
});

test('un décor bas traversé mais loin de la cible ne donne pas le couvert', () => {
  const low = [{ x: 2, y: 0, w: 1, h: 10, t: 'low' }]; // cible en x=10 à 7″ du décor (> 3″)
  const s = sight({ x: 0, y: 5 }, { x: 10, y: 5 }, low);
  assert.equal(s.los, true);
  assert.equal(s.cover, false);
});

test('en terrain dégagé la vue est libre et sans couvert', () => {
  const s = sight({ x: 0, y: 5 }, { x: 10, y: 5 }, []);
  assert.equal(s.los, true);
  assert.equal(s.cover, false);
});

test('un décor bas collé au tireur ne donne pas le couvert', () => {
  const low = [{ x: 0.2, y: 0, w: 0.3, h: 10, t: 'low' }]; // traversé à ~0.2″, sous COVER_MIN_DISTANCE (1″)
  const s = sight({ x: 0, y: 5 }, { x: 10, y: 5 }, low);
  assert.equal(s.los, true);
  assert.equal(s.cover, false);
});

test('une cible ennemie à vue dégagée et à portée peut être visée', () => {
  const chk = canShoot(shooter(), target(), []);
  assert.equal(chk.ok, true);
});

test('on ne peut pas tirer deux fois dans le même tour', () => {
  const m = shooter({ shot: true });
  assert.equal(canShoot(m, target(), []).ok, false);
});

test('on ne peut pas tirer sur une figurine de son propre camp', () => {
  const ally = target({ team: 'A' });
  assert.equal(canShoot(shooter(), ally, []).ok, false);
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

test('on peut cibler un ennemi en vue même si l\'arme équipée est hors de portée', () => {
  const m = shooter({ weapon: { a: 4, bs: 3, range: 8 } });
  const t = target({ x: 10, y: 5 }); // distance 10 > portée 8
  assert.equal(canShoot(m, t, []).ok, false);   // l'arme n'atteint pas
  assert.equal(canTarget(m, t, []).ok, true);   // mais la cible reste sélectionnable
});

test('on ne peut pas cibler un ennemi derrière un mur', () => {
  const wall = [{ x: 4, y: 0, w: 2, h: 10, t: 'wall' }];
  assert.equal(canTarget(shooter(), target(), wall).ok, false);
});

test('une arme fait feu si la cible est dans sa portée, pas au-delà', () => {
  assert.equal(weaponCanFire({ range: 12 }, false, { len: 10 }).ok, true);
  assert.equal(weaponCanFire({ range: 8 }, false, { len: 10 }).ok, false);
});
