// Figurines encore en jeu d'une escouade.
export const aliveOf = (models, t) => models.filter(m => m.alive && m.team === t);

// Nombre de figurines vivantes non encore activées d'une escouade.
export const remaining = (models, t) =>
  models.filter(m => m.alive && m.team === t && !m.activated).length;
