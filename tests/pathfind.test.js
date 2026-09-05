import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findPath } from '../src/rules/pathfind.js';

const len = path => path.slice(1).reduce((s, p, i) => s + Math.hypot(p.x - path[i].x, p.y - path[i].y), 0);

test('sans obstacle, le chemin est la ligne droite', () => {
  const path = findPath({ x: 0, y: 0 }, { x: 10, y: 0 }, []);
  assert.deepEqual(path, [{ x: 0, y: 0 }, { x: 10, y: 0 }]);
});

test('un décor entre le départ et l\'arrivée impose un détour plus long que la ligne droite', () => {
  const rect = { x: 4, y: 3, w: 2, h: 4 }; // coupe la ligne y=5 de x4 à x6
  const path = findPath({ x: 0, y: 5 }, { x: 10, y: 5 }, [rect]);
  assert.ok(path.length > 2);   // au moins un point de passage
  assert.ok(len(path) > 10);    // plus long que la ligne droite (10″)
});

test('si la destination est enfermée dans un décor, aucun chemin n\'est trouvé', () => {
  const rect = { x: 4, y: 4, w: 4, h: 4 };
  assert.equal(findPath({ x: 0, y: 6 }, { x: 6, y: 6 }, [rect]), null); // (6,6) est dans le décor
});
