import { AI_ACT_DELAY } from '../config.js';
import { state } from '../state/game.js';
import { decide, decideMelee } from './decide.js';
import { select, endActivation } from '../loop/turn.js';
import { moveModel, aim } from '../loop/actions.js';
import { declareShot, fire } from '../loop/combat.js';
import { declareFight, fight, submitMeleeChoice } from '../loop/melee.js';

// ============================================================
//  Ordonnanceur de l'IA — CONSOMMATEUR du jeu, au même titre que l'input humain.
//  Il observe `state` et déclenche les mêmes actions ; le cœur ignore son existence.
// ============================================================

let aiSide = null, running = false;

// Active l'IA pour un camp et lance la boucle d'observation (une seule fois).
export function enableAi(side) {
  aiSide = side;
  if (!running) { running = true; setTimeout(tick, AI_ACT_DELAY); }
}

// Le camp `side` est-il piloté par l'IA ? Consulté par l'input pour bloquer la main humaine
// pendant le tour de l'IA (l'humain ne doit pas manipuler les figurines adverses).
export const isAiControlled = side => side === aiSide;

function tick() {
  try { step(); } finally { if (running) setTimeout(tick, AI_ACT_DELAY); }
}

function step() {
  if (!aiSide || state.over) return;

  // 1) Duel de mêlée : si c'est au tour de l'IA de résoudre un dé, soumettre un choix.
  //    Vaut à tout moment (l'IA peut être défenseuse d'un duel lancé par l'humain).
  const d = state.duel;
  if (d && d.live && !d.live.done) {
    const actingTeam = d.live.turn === 'atk' ? d.atk.team : d.def.team;
    if (actingTeam === aiSide) submitMeleeChoice(decideMelee(d.live));
    return;
  }

  // 2) Activation : pendant le tour de l'IA et hors résolution, jouer une intention.
  if (state.busy || state.side !== aiSide) return;
  execute(decide(state, aiSide));
}

// Exécute une intention via l'API d'actions partagée. Tir et mêlée sont lancés sans attendre :
// ils posent `state.busy`, et les ticks suivants (duel) ou le déblocage relancent la boucle.
function execute(it) {
  if (!it.model) return;                 // 'none' : rien à jouer
  select(it.model);
  switch (it.type) {
    case 'aim':   aim(it.model); break;
    case 'move':  moveModel(it.model, it.dest); break;
    case 'shoot': declareShot(it.model, it.target, it.s); fire(); break;
    case 'fight': declareFight(it.model, it.target, it.s); fight(); break;
    case 'end':   endActivation(); break;
  }
}
