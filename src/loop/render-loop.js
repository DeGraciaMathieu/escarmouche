import { cv, ctx, px } from '../canvas.js';
import { BW, BH, SHAKE_DAMPING, SHAKE_MIN, DEPLOY_ZONE_ALPHA } from '../config.js';
import { state } from '../state/game.js';
import { mat, drawTerrain, drawObjectives, drawRange, drawTape, drawTargets, drawModel, drawFiringLine, drawSight, drawHoverName } from '../render/board.js';
import { drawFx } from '../render/fx.js';
import { isEditing, drawEditor } from '../editor/editor.js';

// Boucle de rendu principale : redessine le plateau à chaque frame.
export function render() {
  if (isEditing()) { drawEditor(); requestAnimationFrame(render); return; }
  ctx.save();
  ctx.setTransform(cv.width / px(BW), 0, 0, cv.height / px(BH), 0, 0); // backing (retina) → repère logique 900×660
  if (state.shake > 0) { ctx.translate((Math.random() - .5) * state.shake, (Math.random() - .5) * state.shake); state.shake *= SHAKE_DAMPING; if (state.shake < SHAKE_MIN) state.shake = 0; }
  ctx.drawImage(mat, 0, 0);
  const za = state.deploy.A, zb = state.deploy.B;
  ctx.fillStyle = `rgba(92,127,158,${DEPLOY_ZONE_ALPHA})`; ctx.fillRect(px(za.x), px(za.y), px(za.w), px(za.h));
  ctx.fillStyle = `rgba(180,85,58,${DEPLOY_ZONE_ALPHA})`; ctx.fillRect(px(zb.x), px(zb.y), px(zb.w), px(zb.h));
  drawTerrain();
  drawObjectives();
  if (state.selected && state.selected.team === state.side && state.selected.ap > 0 && !state.selected.anim && !state.busy && !state.over) drawRange(state.selected);
  drawTape(); drawTargets();
  for (const m of state.models) if (m.alive) drawModel(m);
  drawFiringLine(); drawSight(); drawHoverName(); drawFx();
  ctx.restore();
  requestAnimationFrame(render);
}
