import { MOVE_ANIM_BASE, MOVE_ANIM_PER_INCH } from '../config.js';
import { state } from '../state/game.js';
import { moveCheck } from '../rules/movement.js';
import { effectiveBs } from '../rules/combat.js';
import { tone } from '../audio.js';
import { journal } from '../render/ui.js';
import { afterAction } from './turn.js';

// ============================================================
//  Actions du joueur — intentions partagées par l'input humain (controls.js)
//  et par l'IA (src/ai/). Le cœur ignore qui les déclenche.
// ============================================================

// Déplace `m` vers `dest` en contournant le décor. Applique le mouvement s'il est légal (pose
// l'instantané d'annulation, l'animation, dépense 1 PA), sinon ne change rien. Rend le verdict
// de `moveCheck` (le caller peut afficher l'échec). `chk` évite un recalcul si déjà connu.
export function moveModel(m, dest, chk) {
  chk = chk || moveCheck(m, dest, state.models, state.terrain);
  if (!chk.ok) return chk;
  state.undoState = { m, x: m.x, y: m.y, moved: m.moved };
  const path = chk.path, to = path[path.length - 1];
  m.anim = { path, t0: performance.now(), dur: MOVE_ANIM_BASE + chk.d * MOVE_ANIM_PER_INCH };
  m.x = to.x; m.y = to.y; m.ap--; m.moved = true; m.activated = true;
  journal(`<b>${m.name}</b> se déplace de ${chk.d.toFixed(1)}″.`);
  afterAction(m);
  return chk;
}

// Met `m` en joue : abaisse son seuil de touche d'un cran pour son prochain tir (dépense 1 PA).
export function aim(m) {
  m.aimed = true; m.ap--; m.activated = true; state.undoState = null;
  tone(660, .12, 'triangle', .1, 880);
  journal(`<b>${m.name}</b> se met en joue : touche à ${effectiveBs(m.weapon.bs, true)}+.`);
  afterAction(m);
}
