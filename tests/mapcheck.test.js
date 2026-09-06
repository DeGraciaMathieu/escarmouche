import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAPS, createModels } from '../src/state/game.js';
import { OBJECTIVES } from '../src/config.js';
import { checkMap } from '../src/rules/mapcheck.js';

const spawns = () => createModels().map(m => ({ x: m.x, y: m.y, name: m.name }));

test('checkMap valide chaque plan intégré (spawns et objectifs jouables)', () => {
  for (const [key, m] of Object.entries(MAPS)) {
    const r = checkMap(m.terrain, spawns(), OBJECTIVES);
    assert.ok(r.ok, `${key} injouable : ${r.issues.join(' · ')}`);
  }
});

test('checkMap détecte un objectif entièrement recouvert (aucune position à portée)', () => {
  const o = OBJECTIVES[0]; // mur plus large que la zone de contrôle : plus aucune place dégagée
  const terrain = [{ x: o.x - 3.5, y: o.y - 3.5, w: 7, h: 7, t: 'wall' }];
  const r = checkMap(terrain, spawns(), OBJECTIVES);
  assert.equal(r.ok, false);
  assert.ok(r.issues.some(i => i.includes('enfermé')), r.issues.join(' · '));
});

test('checkMap détecte un point rendu inaccessible par une enceinte fermée', () => {
  const o = OBJECTIVES[0]; // scellé dans une boîte de murs, intérieur dégagé mais injoignable
  const terrain = [
    { x: o.x - 3, y: o.y - 3, w: 6, h: 0.5, t: 'wall' },
    { x: o.x - 3, y: o.y + 2.5, w: 6, h: 0.5, t: 'wall' },
    { x: o.x - 3, y: o.y - 3, w: 0.5, h: 6, t: 'wall' },
    { x: o.x + 2.5, y: o.y - 3, w: 0.5, h: 6, t: 'wall' },
  ];
  const r = checkMap(terrain, spawns(), OBJECTIVES);
  assert.equal(r.ok, false);
  assert.ok(r.issues.some(i => i.includes('inaccessible')), r.issues.join(' · '));
});
