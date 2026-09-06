import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide, decideMelee } from '../src/ai/decide.js';
import { candidateActions, bestAction } from '../src/ai/utility.js';
import { planSquad } from '../src/ai/plan.js';
import { createMelee } from '../src/rules/combat.js';
import { OBJECTIVES, MAXTURN } from '../src/config.js';
import { dist } from '../src/rules/geometry.js';

const OBJ = OBJECTIVES[0]; // objectif de référence pour les scénarios de zone

// figurine IA (camp B) et cible ennemie (camp A), champs minimaux lus par les règles
const ai = (o = {}) => ({ team: 'B', alive: true, activated: false, ap: 2, shot: false, aimed: false, moved: false,
  hp: 8, w: 8, r: 0.62, M: 6, sv: 4, x: 0, y: 5, weapon: { a: 4, bs: 3, dn: 3 }, meleeWeapon: { a: 4, ws: 3 }, ...o });
const foe = (o = {}) => ({ team: 'A', alive: true, hp: 12, w: 12, r: 0.62, sv: 4, x: 10, y: 5, ...o });
const st = (models, terrain = []) => ({ models, terrain });

test('une cible au contact déclenche le corps à corps', () => {
  const m = ai(), e = foe({ x: 1.5, y: 5 }); // 1.5″ ≤ portée de contrôle
  assert.equal(decide(st([m, e]), 'B').type, 'fight');
});

test('face à une cible tirable, l\'IA vise d\'abord si elle a deux PA', () => {
  const it = decide(st([ai(), foe({ x: 10, y: 5 })]), 'B');
  assert.equal(it.type, 'aim');
});

test('une fois en joue, l\'IA tire', () => {
  const it = decide(st([ai({ aimed: true }), foe({ x: 10, y: 5 })]), 'B');
  assert.equal(it.type, 'shoot');
});

test('avec un seul PA restant, l\'IA tire sans viser', () => {
  const it = decide(st([ai({ ap: 1, moved: true }), foe({ x: 10, y: 5 })]), 'B');
  assert.equal(it.type, 'shoot');
});

test('sans cible atteignable, l\'IA se rapproche', () => {
  const m = ai({ weapon: { a: 4, bs: 3, range: 4 } }), e = foe({ x: 12, y: 5 }); // hors portée et hors contact
  const it = decide(st([m, e]), 'B');
  assert.equal(it.type, 'move');
  assert.ok(it.dest);
});

test('sans PA, l\'IA termine l\'activation', () => {
  assert.equal(decide(st([ai({ ap: 0 }), foe()]), 'B').type, 'end');
});

test('sans ennemi vivant, l\'IA termine l\'activation', () => {
  assert.equal(decide(st([ai()]), 'B').type, 'end');
});

test('faute de tir ou de mêlée, l\'IA se dirige vers un objectif à prendre', () => {
  const m = ai({ x: OBJ.x - 5, y: OBJ.y, weapon: { a: 4, bs: 3, range: 4 } });
  const e = foe({ x: OBJ.x + 11, y: OBJ.y }); // 16″ : hors de portée et hors contact
  const it = decide(st([m, e]), 'B');
  assert.equal(it.type, 'move');
  assert.ok(dist(it.dest, OBJ) < dist(m, OBJ)); // le déplacement rapproche de l'objectif
});

test('une figurine qui tient un objectif y reste au lieu de charger l\'ennemi', () => {
  const m = ai({ x: OBJ.x, y: OBJ.y, weapon: { a: 4, bs: 3, range: 4 } }); // sur l'objectif, le contrôle
  const e = foe({ x: OBJ.x + 11, y: OBJ.y }); // trop loin pour être tiré ou atteint
  assert.equal(decide(st([m, e]), 'B').type, 'end');
});

test('l\'IA ne quitte pas un tir sûr pour marcher vers un objectif', () => {
  const m = ai({ x: OBJ.x - 5, y: OBJ.y, ap: 1, moved: true }); // 1 PA : tire sans viser
  const e = foe({ x: OBJ.x - 2, y: OBJ.y }); // à portée et en vue (3″)
  assert.equal(decide(st([m, e]), 'B').type, 'shoot');
});

test('entre deux cibles, l\'IA choisit celle qu\'elle peut achever (sécuriser un kill)', () => {
  const m = ai({ ap: 1, moved: true }); // 1 PA : tire sans viser
  const fragile = foe({ x: 10, y: 5, hp: 2 });   // achevable
  const robuste = foe({ x: 9, y: 5, hp: 12 });   // plus proche mais increvable en un tir
  assert.equal(decide(st([m, fragile, robuste]), 'B').target, fragile);
});

test('à cibles comparables, l\'IA préfère la cible à découvert plutôt qu\'à couvert', () => {
  const m = ai({ ap: 1, moved: true });
  const expose = foe({ x: 12, y: 5, hp: 12 });          // exposée, un peu plus loin
  const couvert = foe({ x: 8, y: 11, hp: 12 });         // plus proche mais à couvert
  const ecran = { team: 'B', alive: true, activated: true, r: 0.62, x: 4, y: 8 }; // interposé sur la ligne vers `couvert`
  assert.equal(decide(st([m, expose, couvert, ecran]), 'B').target, expose);
});

test('au déplacement, l\'IA infléchit sa trajectoire vers le flanc à couvert', () => {
  const m = ai({ x: 9, y: 6, weapon: { a: 4, bs: 3, dn: 3, range: 3 } });
  const e = foe({ x: 9, y: 20 }); // plein sud, hors de portée
  const wall = { x: 8, y: 9, w: 2, h: 1, t: 'wall' };       // barre l'axe direct vers l'ennemi
  const cover = { x: 11.5, y: 12, w: 2, h: 0.6, t: 'low' }; // couvert bas côté est
  const pick = terrain => bestAction(candidateActions({ models: [m, e], terrain }, m, 'B', { kind: 'attack' })).intention;
  const sansCouvert = pick([wall]);
  const avecCouvert = pick([wall, cover]);
  assert.equal(avecCouvert.type, 'move');
  assert.ok(avecCouvert.dest.x > sansCouvert.dest.x); // la trajectoire dévie vers le couvert (est)
});

test('l\'IA active en premier la figurine qui peut tirer, pas celle qui doit se déplacer', () => {
  const shooter = ai({ x: 0, y: 5, ap: 1, moved: true });                     // a un tir
  const walker = ai({ x: 0, y: 20, weapon: { a: 4, bs: 3, dn: 3, range: 3 } }); // ennemi hors de portée
  const e = foe({ x: 5, y: 5 });                                              // à portée du tireur seulement
  const it = decide(st([walker, shooter, e]), 'B'); // le marcheur est en tête de liste
  assert.equal(it.type, 'shoot');
  assert.equal(it.model, shooter);
});

test('un objectif disputé reçoit plusieurs figurines (coordination)', () => {
  const contested = OBJECTIVES[0];
  const own = [ai({ x: 14, y: 6 }), ai({ x: 16, y: 6 }), ai({ x: 9, y: 14 }), ai({ x: 21, y: 14 }), ai({ x: 2, y: 2 })];
  const e = foe({ x: contested.x, y: contested.y }); // un défenseur sur l'objectif
  const goals = planSquad(st([...own, e]), 'B');
  const dessus = own.filter(m => { const g = goals.get(m); return g.kind === 'seize' && g.at === contested; });
  assert.equal(dessus.length, 2);
});

test('au dernier tour, les figurines en trop renforcent les objectifs au lieu d\'attaquer', () => {
  const own = [ai({ x: 4, y: 4 }), ai({ x: 4, y: 11 }), ai({ x: 4, y: 18 }), ai({ x: 6, y: 8 }), ai({ x: 6, y: 14 })];
  const e = foe({ x: 25, y: 11 }); // ennemi loin des objectifs

  const dernier = st([...own, e]); dernier.turn = MAXTURN;
  const g = planSquad(dernier, 'B');
  assert.ok(own.every(m => g.get(m).kind === 'seize')); // personne n'attaque au buzzer

  const debut = st([...own, e]); debut.turn = 1;
  const g2 = planSquad(debut, 'B');
  assert.ok(own.some(m => g2.get(m).kind === 'attack')); // à un tour normal, des attaquants restent
});

test('menée aux points, l\'IA renforce les objectifs même en début de partie', () => {
  const own = [ai({ x: 4, y: 4 }), ai({ x: 4, y: 11 }), ai({ x: 4, y: 18 }), ai({ x: 6, y: 8 }), ai({ x: 6, y: 14 })];
  const e = foe({ x: 25, y: 11 });

  const menee = st([...own, e]); menee.turn = 1; menee.score = { A: 2, B: 0 };
  const g = planSquad(menee, 'B');
  assert.ok(own.every(m => g.get(m).kind === 'seize')); // menée : tout l'effectif sur les objectifs

  const egalite = st([...own, e]); egalite.turn = 1; egalite.score = { A: 0, B: 0 };
  const g2 = planSquad(egalite, 'B');
  assert.ok(own.some(m => g2.get(m).kind === 'attack')); // à égalité tôt : neutre, des attaquants restent
});

test('menée en fin de partie, l\'IA envoie une figurine de plus arracher un objectif disputé', () => {
  const contested = OBJECTIVES[0];
  // 5 figurines : 2 pour les objectifs vides, 3 disponibles pour le disputé (aucune surnuméraire)
  const own = [ai({ x: 9, y: 14 }), ai({ x: 21, y: 14 }), ai({ x: 13, y: 6 }), ai({ x: 17, y: 6 }), ai({ x: 15, y: 9 })];
  const enemis = [foe({ x: contested.x, y: contested.y }), foe({ x: contested.x - 1, y: contested.y })]; // 2 défenseurs

  const st3 = st([...own, ...enemis]); st3.turn = MAXTURN; st3.score = { A: 5, B: 0 };
  const goals = planSquad(st3, 'B');
  const dessus = own.filter(m => { const g = goals.get(m); return g.kind === 'seize' && g.at === contested; });
  assert.equal(dessus.length, 3); // cap relevé (2 + 1) quand menée en fin de partie
});

const meleeState = (o) => createMelee({
  atkWeapon: { ws: 3, dn: 3, dc: 4 }, defWeapon: { ws: 3, dn: 3, dc: 5 }, atkHp: 12, defHp: 8, ...o,
});

test('en duel, l\'IA frappe quand il lui reste des réussites', () => {
  const a = decideMelee(meleeState({ atkRolls: [4], defRolls: [1] }));
  assert.equal(a.kind, 'strike');
});

test('en duel, l\'IA frappe avec ses critiques d\'abord', () => {
  const a = decideMelee(meleeState({ atkRolls: [6, 4], defRolls: [1] }));
  assert.equal(a.kind, 'strike');
  assert.equal(a.die, 'crit');
});

test('en duel, l\'IA contre une critique adverse létale si elle le peut', () => {
  // attaquant à 4 PV, défenseur a une critique (dc 5 ≥ 4) et l\'attaquant une critique pour parer
  const a = decideMelee(meleeState({ atkRolls: [6], defRolls: [6], atkHp: 4 }));
  assert.equal(a.kind, 'parry');
  assert.equal(a.target, 'crit');
});
