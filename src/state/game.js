import { BASE_RADIUS, ACTIONS_PER_ACTIVATION, OBJECTIVES, DEPLOY_ZONES } from '../config.js';

export const TEAMS = {
  A: { name: 'Garde de Fer', color: '#5c7f9e', deep: '#33506b' },
  B: { name: 'Écumeurs', color: '#b4553a', deep: '#7b3122' },
};

// Catalogue d'armes : chaque arme est un objet plat de caractéristiques, lu tel quel par
// weaponCanFire (portée, lourde) et resolveShot (dés, touche, dégâts). Partagé en lecture seule.
export const WEAPONS = {
  pm:       { name: 'Pistolet-mitrailleur', a: 4, bs: 3, dn: 3, dc: 4, range: 14 },
  canon:    { name: 'Canon long', a: 4, bs: 3, dn: 4, dc: 5, heavy: true, brutal: true },
  scie:     { name: 'Fusil scié', a: 5, bs: 3, dn: 3, dc: 4, range: 8, saturate: true },
  carabine: { name: 'Carabine', a: 6, bs: 4, dn: 2, dc: 3, range: 10, precision: 1 },
  bolter:   { name: 'Bolter', a: 3, bs: 3, dn: 4, dc: 5, range: 18, ap: 1 },
  assaut:   { name: "Fusil d'assaut", a: 3, bs: 3, dn: 4, dc: 5, range: 20, tracer: 'assaut' },
  sniper:   { name: 'Sniper', a: 2, bs: 2, dn: 5, dc: 6, range: 30, heavy: true, lethal: 5, ap: 1, tracer: 'sniper' },
  plasma:   { name: 'Pistolet plasma', a: 3, bs: 3, dn: 4, dc: 6, range: 12, overheat: true, devastating: 3, tracer: 'plasma' },
};

// Catalogue d'armes de mêlée : `a` dés d'attaque lancés contre la valeur Touche `ws`, dégâts
// `dn` par touche normale et `dc` par critique. Lu par createMelee (rules/combat.js). Chaque
// figurine en porte une, fixe, en plus de son arme de tir.
export const MELEE_WEAPONS = {
  crosse:   { name: 'Crosse', a: 3, ws: 4, dn: 2, dc: 3 },
  couteau:  { name: 'Couteau de combat', a: 4, ws: 3, dn: 3, dc: 4 },
  machette: { name: 'Machette', a: 4, ws: 3, dn: 3, dc: 5 },
  hache:    { name: "Hache d'abordage", a: 4, ws: 3, dn: 4, dc: 6 },
};

// Ensemble cohérent d'armes autorisées pour chaque rôle (trois maximum par rôle).
export const ROLE_LOADOUTS = {
  meneur: ['pm', 'scie', 'plasma'],
  ligne: ['carabine', 'assaut'],
  appui: ['canon', 'sniper', 'bolter'],
};

// Catalogue de plans (décor). Le plan actif est copié dans `state.terrain` au démarrage
// (main.js), selon l'écran de choix. `(x, y)` = coin haut-gauche, `w`/`h` = étendue en pouces.
// Catalogue de pièces de décor. Chaque pièce porte une apparence (`variant`, lue seulement par
// drawTerrain) et une géométrie relative (rects en pouces ; `dx`/`dy` = décalage depuis le point
// de pose). `place(key, x, y)` renvoie les rects absolus, prêts à figurer dans un plan.
export const PIECES = {
  container: { variant: 'container', rects: [{ dx: 0, dy: 0, w: 4, h: 1.8, t: 'wall' }] },
  ruin:      { variant: 'ruin', rects: [{ dx: 0, dy: 0, w: 3, h: 1, t: 'wall' }, { dx: 0, dy: 1, w: 1, h: 2.6, t: 'wall' }] },
  building:  { variant: 'building', rects: [{ dx: 0, dy: 0, w: 4.5, h: 4.5, t: 'wall' }] },
  tank:      { variant: 'tank', rects: [{ dx: 0, dy: 0, w: 2.2, h: 2.2, t: 'wall' }] },
  barricade: { variant: 'barricade', rects: [{ dx: 0, dy: 0, w: 4, h: 0.8, t: 'low' }] },
  crates:    { variant: 'crates', rects: [{ dx: 0, dy: 0, w: 2, h: 2, t: 'low' }] },
};

// Pose une pièce du catalogue en (x, y) : rects absolus portant son `variant`.
export function place(key, x, y) {
  const p = PIECES[key];
  return p.rects.map(r => ({ x: x + r.dx, y: y + r.dy, w: r.w, h: r.h, t: r.t, variant: p.variant }));
}

// Applique un skin (variant) à des rects écrits en dur, sans changer leur géométrie.
const skin = (variant, ...rects) => rects.map(r => ({ ...r, variant }));

export const MAPS = {
  // Plan d'origine : murs et couvert épars.
  classique: {
    name: 'Classique',
    desc: 'Murs et couvert épars — le plan d’origine.',
    terrain: [
      ...skin('ruin',
        { x: 6, y: 3.5, w: 1.2, h: 5, t: 'wall' }, { x: 6, y: 13.5, w: 1.2, h: 5, t: 'wall' },
        { x: 22.8, y: 3.5, w: 1.2, h: 5, t: 'wall' }, { x: 22.8, y: 13.5, w: 1.2, h: 5, t: 'wall' }),
      ...skin('building', { x: 13, y: 8.5, w: 4, h: 5, t: 'wall' }),
      ...skin('container', { x: 10, y: 0.8, w: 3.4, h: 1.2, t: 'wall' }, { x: 16.6, y: 20, w: 3.4, h: 1.2, t: 'wall' }),
      ...skin('barricade', { x: 10.6, y: 5.4, w: 4, h: 0.8, t: 'low' }, { x: 15.4, y: 15.8, w: 4, h: 0.8, t: 'low' }),
      ...skin('crates',
        { x: 2, y: 9, w: 1, h: 4, t: 'low' }, { x: 27, y: 9, w: 1, h: 4, t: 'low' },
        { x: 19.4, y: 10.4, w: 0.8, h: 3, t: 'low' }, { x: 9.8, y: 10.4, w: 0.8, h: 3, t: 'low' },
        { x: 14.2, y: 2.6, w: 0.8, h: 3, t: 'low' }, { x: 15, y: 18, w: 0.8, h: 2.4, t: 'low' }),
    ],
  },
  // Grille 3×3 de salles séparées par des cloisons percées de portes (brèche de 3″), symétrique.
  secteur: {
    name: 'Secteur',
    desc: 'Grille de salles reliées par des portes.',
    terrain: [
      ...skin('ruin',
        { x: 11.2, y: 0, w: 0.8, h: 2, t: 'wall' }, { x: 11.2, y: 5, w: 0.8, h: 4.5, t: 'wall' },
        { x: 11.2, y: 12.5, w: 0.8, h: 4.5, t: 'wall' }, { x: 11.2, y: 20, w: 0.8, h: 2, t: 'wall' },
        { x: 18, y: 0, w: 0.8, h: 2, t: 'wall' }, { x: 18, y: 5, w: 0.8, h: 4.5, t: 'wall' },
        { x: 18, y: 12.5, w: 0.8, h: 4.5, t: 'wall' }, { x: 18, y: 20, w: 0.8, h: 2, t: 'wall' },
        { x: 5, y: 6.6, w: 1.6, h: 0.8, t: 'wall' }, { x: 9.6, y: 6.6, w: 3.9, h: 0.8, t: 'wall' },
        { x: 16.5, y: 6.6, w: 3.9, h: 0.8, t: 'wall' }, { x: 23.4, y: 6.6, w: 1.6, h: 0.8, t: 'wall' },
        { x: 5, y: 14.6, w: 1.6, h: 0.8, t: 'wall' }, { x: 9.6, y: 14.6, w: 3.9, h: 0.8, t: 'wall' },
        { x: 16.5, y: 14.6, w: 3.9, h: 0.8, t: 'wall' }, { x: 23.4, y: 14.6, w: 1.6, h: 0.8, t: 'wall' }),
      ...skin('crates', { x: 7.4, y: 10.2, w: 0.8, h: 1.6, t: 'low' }, { x: 21.8, y: 10.2, w: 0.8, h: 1.6, t: 'low' }),
      ...skin('barricade', { x: 14.2, y: 2.6, w: 1.6, h: 0.8, t: 'low' }, { x: 14.2, y: 18.6, w: 1.6, h: 0.8, t: 'low' }),
    ],
  },
  // Complexe fortifié : bunker central à trois portes, deux salles verrouillées à porte unique,
  // couloir central et lanes hautes. Symétrique autour de l'axe vertical (x = 15). Portes = brèches
  // de 3″ (passage libre après inflation ≈ 1,9″). Objectifs (15,6) / (9,15) / (21,15) à l'intérieur.
  bastion: {
    name: 'Bastion',
    desc: 'Bunker à trois portes et deux salles verrouillées.',
    terrain: [
      // Bunker central (objectif 15,6) : murs sur les 4 côtés, portes de 4″ gauche/droite/bas
      // (≈2,9″ de passage libre après inflation). Façade haute close.
      ...skin('building',
        { x: 11.5, y: 2.5, w: 7, h: 0.7, t: 'wall' },
        { x: 11.5, y: 9.5, w: 1.5, h: 0.7, t: 'wall' }, { x: 17, y: 9.5, w: 1.5, h: 0.7, t: 'wall' },     // bas, porte 13–17
        { x: 11.5, y: 3.2, w: 0.7, h: 0.8, t: 'wall' }, { x: 11.5, y: 8, w: 0.7, h: 2.2, t: 'wall' },     // gauche, porte 4–8
        { x: 17.8, y: 3.2, w: 0.7, h: 0.8, t: 'wall' }, { x: 17.8, y: 8, w: 0.7, h: 2.2, t: 'wall' }),    // droite, porte 4–8
      // Salle gauche verrouillée (objectif 9,15) : porte unique en haut (7–11) vers le couloir.
      ...skin('building',
        { x: 5.5, y: 13.3, w: 1.5, h: 0.7, t: 'wall' }, { x: 11, y: 13.3, w: 1.5, h: 0.7, t: 'wall' },
        { x: 5.5, y: 18.8, w: 7, h: 0.7, t: 'wall' },
        { x: 5.5, y: 13.3, w: 0.7, h: 6.2, t: 'wall' }, { x: 11.8, y: 13.3, w: 0.7, h: 6.2, t: 'wall' }),
      // Salle droite verrouillée (objectif 21,15), miroir : porte unique en haut (19–23).
      ...skin('building',
        { x: 17.5, y: 13.3, w: 1.5, h: 0.7, t: 'wall' }, { x: 23, y: 13.3, w: 1.5, h: 0.7, t: 'wall' },
        { x: 17.5, y: 18.8, w: 7, h: 0.7, t: 'wall' },
        { x: 17.5, y: 13.3, w: 0.7, h: 6.2, t: 'wall' }, { x: 23.8, y: 13.3, w: 0.7, h: 6.2, t: 'wall' }),
      // Pylônes hauts : partitionnent la bande supérieure en lanes.
      ...skin('ruin', { x: 9.5, y: 0, w: 0.7, h: 3.5, t: 'wall' }, { x: 19.8, y: 0, w: 0.7, h: 3.5, t: 'wall' }),
      // Couvert bas, hors des couloirs de porte : approche haute/basse et flancs du bunker.
      ...skin('barricade', { x: 13.4, y: 1, w: 3.2, h: 0.7, t: 'low' }, { x: 13.4, y: 20.3, w: 3.2, h: 0.7, t: 'low' }),
      ...skin('crates', { x: 6.2, y: 8, w: 1.4, h: 1.4, t: 'low' }, { x: 22.4, y: 8, w: 1.4, h: 1.4, t: 'low' }),
    ],
  },
  // Avant-poste industriel : conteneurs, bâtiment central, cuves et couvert épars, assemblé de pièces.
  avantPoste: {
    name: 'Avant-poste',
    desc: 'Dépôt industriel : conteneurs, cuves et ruines.',
    terrain: [
      ...place('container', 6, 3), ...place('container', 20, 3),
      ...place('container', 6, 17.2), ...place('container', 20, 17.2),
      ...place('building', 12.75, 8.75),
      ...place('ruin', 5, 9.5), ...place('ruin', 22, 9.5),
      ...place('tank', 9.5, 12), ...place('tank', 18.3, 6),
      ...place('barricade', 11, 5.5), ...place('barricade', 15, 16),
      ...place('crates', 6, 7), ...place('crates', 22, 13), ...place('crates', 13.5, 14),
    ],
  },
};

const mk = o => ({ r: BASE_RADIUS, apl: ACTIONS_PER_ACTIVATION, ap: ACTIONS_PER_ACTIVATION, aimed: false, moved: false, shot: false, activated: false, alive: true, anim: null, flash: 0, ...o, hp: o.w });

// Effectif de départ des deux escouades.
export function createModels() {
  return [
    mk({ id: 1, team: 'A', name: 'Sergent Kael', role: 'meneur', M: 5, sv: 3, w: 12, x: 3, y: 7,
      weapon: WEAPONS.pm, meleeWeapon: MELEE_WEAPONS.couteau }),
    mk({ id: 2, team: 'A', name: 'Fusilier Dorn', role: 'ligne', M: 5, sv: 3, w: 12, x: 4.4, y: 11,
      weapon: WEAPONS.assaut, meleeWeapon: MELEE_WEAPONS.crosse }),
    mk({ id: 3, team: 'A', name: 'Tireur Vess', role: 'appui', M: 4, sv: 3, w: 12, x: 3, y: 15,
      weapon: WEAPONS.canon, meleeWeapon: MELEE_WEAPONS.crosse }),
    mk({ id: 8, team: 'A', name: 'Fusilier Bram', role: 'ligne', M: 5, sv: 3, w: 12, x: 4.4, y: 4,
      weapon: WEAPONS.assaut, meleeWeapon: MELEE_WEAPONS.crosse }),
    mk({ id: 4, team: 'B', name: 'Chef Sarn', role: 'meneur', M: 7, sv: 4, w: 10, x: 27, y: 6,
      weapon: WEAPONS.scie, meleeWeapon: MELEE_WEAPONS.hache }),
    mk({ id: 5, team: 'B', name: 'Pillard Kro', role: 'ligne', M: 7, sv: 5, w: 8, x: 25.8, y: 9.6,
      weapon: WEAPONS.carabine, meleeWeapon: MELEE_WEAPONS.machette }),
    mk({ id: 6, team: 'B', name: 'Pillard Yun', role: 'ligne', M: 7, sv: 5, w: 8, x: 25.8, y: 13,
      weapon: WEAPONS.carabine, meleeWeapon: MELEE_WEAPONS.machette }),
    mk({ id: 7, team: 'B', name: 'Pillard Tass', role: 'ligne', M: 7, sv: 5, w: 8, x: 27, y: 16.5,
      weapon: WEAPONS.carabine, meleeWeapon: MELEE_WEAPONS.machette }),
    mk({ id: 9, team: 'B', name: 'Pillard Vos', role: 'ligne', M: 7, sv: 5, w: 8, x: 25.8, y: 19.5,
      weapon: WEAPONS.carabine, meleeWeapon: MELEE_WEAPONS.machette }),
  ];
}

// État mutable partagé de la partie. Rempli par main (models, rng) au démarrage.
export const state = {
  turn: 1,
  side: 'A',
  score: { A: 0, B: 0 }, // total de points de chaque camp (éliminations + objectifs)
  selected: null,
  busy: false,
  over: false,
  drag: null,
  hoverModel: null,
  undoState: null,
  pending: null,      // tir déclaré, en attente de confirmation
  duel: null,         // duel de corps à corps en cours (état interactif)
  terrain: [],        // plan de décor actif, choisi au démarrage (main.js)
  objectives: OBJECTIVES.map(o => ({ ...o })),                    // marqueurs d'objectif du plan actif
  deploy: { A: { ...DEPLOY_ZONES.A }, B: { ...DEPLOY_ZONES.B } }, // zones de déploiement du plan actif
  speed: 1,           // accéléré si le joueur clique pendant la résolution
  shake: 0,
  models: [],
  rng: null,          // générateur à graine, injecté par main
};
