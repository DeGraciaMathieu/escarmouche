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

// Vainqueur par anéantissement : rend l'escouade adverse si l'une est entièrement hors de
// combat, sinon null.
export function annihilationWinner(models) {
  for (const t of ['A', 'B']) {
    if (!models.some(m => m.alive && m.team === t)) return t === 'A' ? 'B' : 'A';
  }
  return null;
}

// Vainqueur à la fin de la partie : plus de figurines debout, sinon plus de PV cumulés,
// sinon match nul (null).
export function attritionWinner(models) {
  const a = models.filter(m => m.alive && m.team === 'A');
  const b = models.filter(m => m.alive && m.team === 'B');
  if (a.length !== b.length) return a.length > b.length ? 'A' : 'B';
  const ha = a.reduce((s, m) => s + m.hp, 0), hb = b.reduce((s, m) => s + m.hp, 0);
  return ha === hb ? null : (ha > hb ? 'A' : 'B');
}
