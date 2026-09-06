import { meleeOptions } from '../rules/combat.js';
import { engagedModel } from '../rules/turn.js';
import { candidateActions, bestAction } from './utility.js';

// ============================================================
//  Décision de l'IA — colle PURE (aucun DOM, aucun hasard).
//  Choisit la figurine à activer puis délègue le choix d'action au moteur d'utilité.
//  Rend une INTENTION, jamais un effet. Exécutée par le runner.
// ============================================================

// Intention suivante de l'IA du camp `side` : engager la figurine active (celle en cours
// d'activation, sinon la première non activée) et retenir son action de meilleure utilité.
export function decide(state, side) {
  const { models } = state;
  const m = engagedModel(models, side) || models.find(x => x.alive && x.team === side && !x.activated);
  if (!m) return { type: 'none' };
  if (m.ap <= 0) return { type: 'end', model: m };
  return bestAction(candidateActions(state, m, side)).intention;
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
