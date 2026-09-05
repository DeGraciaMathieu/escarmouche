import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moveCheck } from '../src/rules/movement.js';
import { dist } from '../src/rules/geometry.js';

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

test('un décor est contourné si le détour tient dans le mouvement', () => {
  const m = unit({ M: 10, x: 1, y: 5 });
  const wall = [{ x: 4, y: 4, w: 1, h: 2, t: 'wall' }]; // petit obstacle sur la ligne droite
  const chk = moveCheck(m, { x: 8, y: 5 }, [m], wall);
  assert.equal(chk.ok, true);
  assert.ok(chk.path.length > 2);                                 // le chemin contourne l'obstacle
  assert.ok(chk.d > dist({ x: 1, y: 5 }, { x: 8, y: 5 }));        // donc plus long que la ligne droite
});

test('un détour plus long que le mouvement est refusé', () => {
  const m = unit({ M: 5, x: 1, y: 5 });
  const wall = [{ x: 3, y: 0, w: 1, h: 10, t: 'wall' }];
  // 5″ en ligne droite jusqu'à (6,5), mais le contour du mur dépasse le mouvement
  assert.equal(moveCheck(m, { x: 6, y: 5 }, [m], wall).ok, false);
});

test('on ne peut pas sortir du plateau', () => {
  const m = unit({ M: 5, x: 28, y: 5 });
  assert.equal(moveCheck(m, { x: 30, y: 5 }, [m], []).ok, false); // 30″ dépasse le bord (BW = 30)
});

test('on ne peut pas finir son mouvement à l\'intérieur d\'un décor', () => {
  const m = unit({ M: 5, x: 5, y: 5 });
  const decor = [{ x: 8, y: 3, w: 2, h: 4, t: 'low' }];
  assert.equal(moveCheck(m, { x: 9, y: 5 }, [m], decor).ok, false); // le socle ne rentre pas dans le décor
});

test('une figurine coincée dans la marge d\'un décor peut s\'en dégager', () => {
  const m = unit({ M: 5, x: 7.6, y: 5 }); // dans la marge du décor mais pas dans le décor lui-même
  const decor = [{ x: 8, y: 3, w: 4, h: 6, t: 'low' }];
  assert.equal(moveCheck(m, { x: 6, y: 5 }, [m], decor).ok, true); // elle recule pour se dégager
});
