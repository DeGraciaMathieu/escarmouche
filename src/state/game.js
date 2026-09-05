import { BASE_RADIUS, ACTIONS_PER_ACTIVATION } from '../config.js';

export const TEAMS = {
  A: { name: 'Garde de Fer', color: '#5c7f9e', deep: '#33506b' },
  B: { name: 'Écumeurs', color: '#b4553a', deep: '#7b3122' },
};

export const TERRAIN = [
  { x: 6, y: 3.5, w: 1.2, h: 5, t: 'wall' }, { x: 6, y: 13.5, w: 1.2, h: 5, t: 'wall' },
  { x: 22.8, y: 3.5, w: 1.2, h: 5, t: 'wall' }, { x: 22.8, y: 13.5, w: 1.2, h: 5, t: 'wall' },
  { x: 13, y: 8.5, w: 4, h: 5, t: 'wall' }, { x: 10, y: 0.8, w: 3.4, h: 1.2, t: 'wall' }, { x: 16.6, y: 20, w: 3.4, h: 1.2, t: 'wall' },
  { x: 2, y: 9, w: 1, h: 4, t: 'low' }, { x: 27, y: 9, w: 1, h: 4, t: 'low' },
  { x: 10.6, y: 5.4, w: 4, h: 0.8, t: 'low' }, { x: 15.4, y: 15.8, w: 4, h: 0.8, t: 'low' },
  { x: 19.4, y: 10.4, w: 0.8, h: 3, t: 'low' }, { x: 9.8, y: 10.4, w: 0.8, h: 3, t: 'low' },
  { x: 14.2, y: 2.6, w: 0.8, h: 3, t: 'low' }, { x: 15, y: 18, w: 0.8, h: 2.4, t: 'low' },
];

const mk = o => ({ r: BASE_RADIUS, apl: ACTIONS_PER_ACTIVATION, ap: ACTIONS_PER_ACTIVATION, aimed: false, moved: false, shot: false, activated: false, alive: true, anim: null, flash: 0, ...o, hp: o.w });

// Effectif de départ des deux escouades.
export function createModels() {
  return [
    mk({ id: 1, team: 'A', name: 'Sergent Kael', role: 'meneur', M: 5, sv: 3, w: 12, x: 3, y: 7,
      weapon: { name: 'Pistolet-mitrailleur', a: 4, bs: 3, dn: 3, dc: 4, range: 12 } }),
    mk({ id: 2, team: 'A', name: 'Fusilier Dorn', role: 'ligne', M: 5, sv: 3, w: 12, x: 4.4, y: 11,
      weapon: { name: 'Fusil de combat', a: 4, bs: 3, dn: 3, dc: 4 } }),
    mk({ id: 3, team: 'A', name: 'Tireur Vess', role: 'appui', M: 4, sv: 3, w: 12, x: 3, y: 15,
      weapon: { name: 'Canon long', a: 4, bs: 2, dn: 4, dc: 5, heavy: true } }),
    mk({ id: 4, team: 'B', name: 'Chef Sarn', role: 'meneur', M: 7, sv: 4, w: 10, x: 27, y: 6,
      weapon: { name: 'Fusil scié', a: 5, bs: 3, dn: 3, dc: 4, range: 8 } }),
    mk({ id: 5, team: 'B', name: 'Pillard Kro', role: 'ligne', M: 7, sv: 5, w: 8, x: 25.8, y: 9.6,
      weapon: { name: 'Carabine', a: 4, bs: 4, dn: 3, dc: 4 } }),
    mk({ id: 6, team: 'B', name: 'Pillard Yun', role: 'ligne', M: 7, sv: 5, w: 8, x: 25.8, y: 13,
      weapon: { name: 'Carabine', a: 4, bs: 4, dn: 3, dc: 4 } }),
    mk({ id: 7, team: 'B', name: 'Pillard Tass', role: 'ligne', M: 7, sv: 5, w: 8, x: 27, y: 16.5,
      weapon: { name: 'Carabine', a: 4, bs: 4, dn: 3, dc: 4 } }),
  ];
}

// État mutable partagé de la partie. Rempli par main (models, rng) au démarrage.
export const state = {
  turn: 1,
  side: 'A',
  selected: null,
  busy: false,
  over: false,
  drag: null,
  hoverModel: null,
  undoState: null,
  pending: null,      // tir déclaré, en attente de confirmation
  speed: 1,           // accéléré si le joueur clique pendant la résolution
  shake: 0,
  models: [],
  rng: null,          // générateur à graine, injecté par main
};
