// Décide ce qui suit la fin d'une activation :
// - 'switch' : l'escouade adverse a encore des figurines à activer, on lui passe la main ;
// - 'newTurn' : plus personne à activer des deux côtés, nouveau tour ;
// - 'continue' : l'adverse a fini mais le camp courant enchaîne.
export function decideActivationEnd(models, side) {
  const other = side === 'A' ? 'B' : 'A';
  const otherLeft = models.some(m => m.alive && m.team === other && !m.activated);
  const sameLeft = models.some(m => m.alive && m.team === side && !m.activated);
  if (otherLeft) return { type: 'switch', side: other };
  if (!sameLeft) return { type: 'newTurn' };
  return { type: 'continue' };
}

// Figurine « engagée » d'un camp : elle a déjà dépensé un point dans son activation mais il
// lui en reste. Tant qu'elle n'a pas fini, on ne peut pas en activer une autre — sinon aucune
// activation ne s'achèverait et la main ne passerait jamais à l'adversaire. Il y en a au plus
// une à la fois. Rend cette figurine, sinon null.
export function engagedModel(models, side) {
  return models.find(m => m.alive && m.team === side && m.activated && m.ap > 0) || null;
}

// Une figurine peut agir (déplacer, viser, tirer, combattre) si elle est vivante, de son camp,
// qu'il lui reste un point d'action, et qu'aucune AUTRE figurine du camp n'est déjà engagée dans
// son activation. Reste vrai en cours d'activation — elle a déjà agi mais garde un PA (ex. se
// déplacer une seconde fois).
export function canAct(m, models, side) {
  if (!m || !m.alive || m.team !== side || m.ap <= 0) return false;
  const busy = engagedModel(models, side);
  return !busy || busy === m;
}

// Vainqueur par anéantissement : rend l'escouade adverse si l'une est entièrement hors de
// combat, sinon null.
export function annihilationWinner(models) {
  for (const t of ['A', 'B']) {
    if (!models.some(m => m.alive && m.team === t)) return t === 'A' ? 'B' : 'A';
  }
  return null;
}

// Vainqueur aux points à la fin de la partie : plus grand total, sinon match nul (null).
export function scoreWinner(score) {
  if (score.A === score.B) return null;
  return score.A > score.B ? 'A' : 'B';
}
