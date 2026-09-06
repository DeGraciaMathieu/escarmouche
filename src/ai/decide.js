import { meleeOptions } from '../rules/combat.js';
import { engagedModel } from '../rules/turn.js';
import { candidateActions, bestAction } from './utility.js';
import { planSquad } from './plan.js';

// ============================================================
//  Décision de l'IA — colle PURE (aucun DOM, aucun hasard).
//  Choisit la figurine à activer puis délègue le choix d'action au moteur d'utilité.
//  Rend une INTENTION, jamais un effet. Exécutée par le runner.
// ============================================================

// Intention suivante de l'IA du camp `side`. Si une figurine est déjà engagée, on la poursuit ;
// sinon on choisit, parmi les figurines non activées, celle dont la meilleure action a la plus
// haute utilité (on active en premier celle qui accomplit le plus — kill, objectif — et on garde
// les repositionnements pour la fin). Chaque figurine agit selon son but (plan de camp).
export function decide(state, side) {
  const { models } = state;
  const plan = planSquad(state, side);
  const engaged = engagedModel(models, side);
  const actable = engaged ? [engaged] : models.filter(x => x.alive && x.team === side && !x.activated);
  if (!actable.length) return { type: 'none' };

  let choice = null, choiceBest = null;
  for (const m of actable) {
    if (m.ap <= 0) continue;
    const best = bestAction(candidateActions(state, m, side, plan.get(m) || { kind: 'attack' }));
    if (!choiceBest || best.priority > choiceBest.priority
        || (best.priority === choiceBest.priority && best.value > choiceBest.value)) {
      choice = m; choiceBest = best;
    }
  }
  return choice ? choiceBest.intention : { type: 'end', model: actable[0] };
}

// Choix de l'IA dans un duel (état vivant `duel`) : contrer une critique adverse seulement si
// elle est létale et parable, sinon frapper — critique d'abord.
export function decideMelee(duel) {
  const opts = meleeOptions(duel);
  if (!opts.length) return null;
  const me = duel[duel.turn], foe = duel[duel.turn === 'atk' ? 'def' : 'atk'];
  if (foe.crits > 0 && foe.dc >= me.hp) {
    const parry = opts.find(o => o.kind === 'parry' && o.die === 'crit' && o.target === 'crit');
    if (parry) return parry;
  }
  return opts.find(o => o.kind === 'strike' && o.die === 'crit')
      || opts.find(o => o.kind === 'strike');
}
