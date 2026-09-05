import { cv, ctx, px } from '../canvas.js';
import { BW, SHAKE_DAMPING, SHAKE_MIN } from '../config.js';
import { state } from '../state/game.js';
import { mat, drawTerrain, drawRange, drawTape, drawTargets, drawModel, drawFiringLine, drawSight, drawHoverName } from '../render/board.js';
import { drawFx } from '../render/fx.js';

// Boucle de rendu principale : redessine le plateau à chaque frame.
export function render() {
  ctx.save();
  if (state.shake > 0) { ctx.translate((Math.random() - .5) * state.shake, (Math.random() - .5) * state.shake); state.shake *= SHAKE_DAMPING; if (state.shake < SHAKE_MIN) state.shake = 0; }
  ctx.drawImage(mat, 0, 0);
  ctx.fillStyle = 'rgba(92,127,158,.06)'; ctx.fillRect(0, 0, px(5), cv.height);
  ctx.fillStyle = 'rgba(180,85,58,.06)'; ctx.fillRect(px(BW - 5), 0, px(5), cv.height);
  drawTerrain();
  if (state.selected && state.selected.team === state.side && state.selected.ap > 0 && !state.selected.anim && !state.busy && !state.over) drawRange(state.selected);
  drawTape(); drawTargets();
  for (const m of state.models) if (m.alive) drawModel(m);
  drawFiringLine(); drawSight(); drawHoverName(); drawFx();
  ctx.restore();
  requestAnimationFrame(render);
}
