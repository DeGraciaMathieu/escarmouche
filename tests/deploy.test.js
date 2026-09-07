import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createModels } from '../src/state/game.js';
import { DEPLOY_ZONES } from '../src/config.js';
import { placeSpawns } from '../src/rules/deploy.js';
import { pointInRect } from '../src/rules/geometry.js';

test('sur les zones par défaut, le déploiement laisse les positions inchangées', () => {
  const base = createModels();
  const placed = placeSpawns(base, DEPLOY_ZONES);
  placed.forEach((m, i) => {
    assert.equal(m.x, base[i].x, `${m.name} déplacée en x`);
    assert.equal(m.y, base[i].y, `${m.name} déplacée en y`);
  });
});

test('chaque figurine atterrit dans la zone de son camp, zones déplacées', () => {
  const deploy = { A: { x: 8, y: 2, w: 4, h: 6 }, B: { x: 20, y: 14, w: 6, h: 5 } };
  const placed = placeSpawns(createModels(), deploy);
  for (const m of placed) assert.ok(pointInRect(m, deploy[m.team]), `${m.name} hors de sa zone`);
});

test('placeSpawns ne mute pas ses arguments', () => {
  const base = createModels();
  const snapshot = base.map(m => ({ x: m.x, y: m.y }));
  placeSpawns(base, { A: { x: 0, y: 0, w: 1, h: 1 }, B: { x: 0, y: 0, w: 1, h: 1 } });
  base.forEach((m, i) => assert.deepEqual({ x: m.x, y: m.y }, snapshot[i]));
});
