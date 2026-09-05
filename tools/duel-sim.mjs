// Analyseur de duels — outil hors jeu (pas un test : aucune assertion).
//
// Rejoue la règle pure `resolveShot` des milliers de fois pour chiffrer l'équilibrage du
// catalogue APRÈS sauvegardes — ce que les dégâts bruts « papier » ne montrent pas, car
// l'écart de sauvegarde (sv3 vs sv5) change tout.
//
// Lancement : `node tools/duel-sim.mjs [nbTirages]`   (défaut 20000, graine fixe → reproductible)
//
// Hypothèses assumées : on suppose la cible À PORTÉE (la portée et le trait « lourde » ne
// changent que le DROIT de tirer, pas les dégâts d'un tir qui a lieu) et le tireur NON en joue.

import { WEAPONS, ROLE_LOADOUTS } from '../src/state/game.js';
import { resolveShot, effectiveBs } from '../src/rules/combat.js';
import { createRng } from '../src/rules/rng.js';
import { DEFENSE_DICE, DICE_FACES } from '../src/config.js';

const N = Number(process.argv[2]) || 20000;
const SEED = 20260905;
const rng = createRng(SEED);

const rollDie = () => 1 + Math.floor(rng() * DICE_FACES);
const rollDice = n => Array.from({ length: n }, rollDie);

// Un tir : lance les dés d'attaque et de défense, délègue la résolution à la règle pure,
// renvoie les dégâts infligés.
function shoot(weapon, target, { cover = false, aimed = false } = {}) {
  const bs = effectiveBs(weapon.bs, aimed);
  return resolveShot({
    atkRolls: rollDice(weapon.a),
    defRolls: rollDice(DEFENSE_DICE),
    bs, sv: target.sv, cover, dn: weapon.dn, dc: weapon.dc,
  }).damage;
}

// Dégâts moyens par tir (et écart-type) sur N tirages.
function damageStats(weapon, target, opts) {
  let sum = 0, sumSq = 0;
  for (let i = 0; i < N; i++) { const d = shoot(weapon, target, opts); sum += d; sumSq += d * d; }
  const mean = sum / N;
  return { mean, sd: Math.sqrt(sumSq / N - mean * mean) };
}

// TTK : nombre moyen de tirs pour mettre la cible hors de combat (encaisse le gaspillage).
function ttk(weapon, target, opts) {
  let total = 0;
  for (let i = 0; i < N; i++) {
    let hp = target.hp, shots = 0;
    while (hp > 0 && shots < 100) { hp -= shoot(weapon, target, opts); shots++; }
    total += shots;
  }
  return total / N;
}

// Profils de cible tirés de l'effectif réel (sv = sauvegarde, hp = PV).
const TARGETS = [
  { name: 'Garde  sv3+/12', sv: 3, hp: 12 },
  { name: 'Chef   sv4+/10', sv: 4, hp: 10 },
  { name: 'Pillard sv5+/8', sv: 5, hp: 8 },
];

// Ordre d'affichage des armes : par rôle, comme le catalogue de loadouts.
const ROLE_OF = {};
for (const [role, keys] of Object.entries(ROLE_LOADOUTS)) for (const k of keys) ROLE_OF[k] = role;
const WEAPON_KEYS = Object.keys(WEAPONS).filter(k => ROLE_OF[k]);

const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);
const f1 = x => x.toFixed(1);
const f2 = x => x.toFixed(2);

console.log(`\n=== Analyseur de duels — ${N} tirages, graine ${SEED} ===`);
console.log('Dégâts moyens par tir · TTK = tirs pour mettre hors de combat · (c) = cible à couvert\n');

// --- Section 1 : dégâts & TTK par arme contre chaque profil de cible.
for (const t of TARGETS) {
  console.log(`--- Cible : ${t.name} ${'-'.repeat(46)}`);
  console.log(`  ${pad('arme', 20)}${padL('dég.', 7)}${padL('dég.(c)', 9)}${padL('TTK', 7)}${padL('TTK(c)', 9)}`);
  for (const key of WEAPON_KEYS) {
    const w = WEAPONS[key];
    const d = damageStats(w, t, {}), dc = damageStats(w, t, { cover: true });
    const k = ttk(w, t, {}), kc = ttk(w, t, { cover: true });
    console.log(`  ${pad(w.name, 20)}${padL(f2(d.mean), 7)}${padL(f2(dc.mean), 9)}${padL(f1(k), 7)}${padL(f1(kc), 9)}`);
  }
  console.log('');
}

// --- Section 2 : classement de puissance (dégâts moyens, tous profils confondus, sans couvert).
console.log(`--- Classement de puissance (dégâts moyens, 3 profils, sans couvert) ${'-'.repeat(8)}`);
const ranking = WEAPON_KEYS.map(key => {
  const w = WEAPONS[key];
  const mean = TARGETS.reduce((s, t) => s + damageStats(w, t, {}).mean, 0) / TARGETS.length;
  return { name: w.name, role: ROLE_OF[key], mean };
}).sort((a, b) => b.mean - a.mean);
for (const r of ranking) console.log(`  ${pad(r.name, 20)}${pad('(' + r.role + ')', 10)}${padL(f2(r.mean), 7)}`);
const spread = ranking[0].mean - ranking[ranking.length - 1].mean;
console.log(`\n  Bande : ${f2(ranking[ranking.length - 1].mean)} → ${f2(ranking[0].mean)}  (amplitude ${f2(spread)})\n`);

// --- Section 3 : duels 1v1 entre archétypes réels (éclaire l'équilibrage inter-faction).
// Deux figurines se tirent dessus à tour de rôle jusqu'à ce que l'une tombe. L'initiative
// (qui tire en premier) est tirée au sort 50/50 pour isoler le duel de stats de l'avantage
// du premier tir. On ignore portée et déplacement (cible supposée engagée, à découvert).
function duel(a, b) {
  let ha = a.hp, hb = b.hp;
  let aTurn = rng() < 0.5;
  for (let step = 0; step < 200; step++) {
    if (aTurn) { hb -= shoot(a.weapon, b); if (hb <= 0) return 'a'; }
    else { ha -= shoot(b.weapon, a); if (ha <= 0) return 'b'; }
    aTurn = !aTurn;
  }
  return ha >= hb ? 'a' : 'b'; // filet de sécurité (n'arrive pas)
}

const GARDE = [
  { name: 'Kael/pm', sv: 3, hp: 12, weapon: WEAPONS.pm },
  { name: 'Dorn/fusil', sv: 3, hp: 12, weapon: WEAPONS.fusil },
  { name: 'Vess/canon', sv: 3, hp: 12, weapon: WEAPONS.canon },
];
const ECUM = [
  { name: 'Sarn/scie', sv: 4, hp: 10, weapon: WEAPONS.scie },
  { name: 'Pillard/carabine', sv: 5, hp: 8, weapon: WEAPONS.carabine },
];

console.log(`--- Duels 1v1 : % de victoire de la Garde de Fer (initiative 50/50) ${'-'.repeat(6)}`);
console.log(`  ${pad('', 18)}${ECUM.map(e => padL(e.name, 18)).join('')}`);
for (const g of GARDE) {
  const cells = ECUM.map(e => {
    let win = 0;
    for (let i = 0; i < N; i++) if (duel(g, e) === 'a') win++;
    return padL(f1(100 * win / N) + '%', 18);
  });
  console.log(`  ${pad(g.name, 18)}${cells.join('')}`);
}
console.log('\n  > 50 % = la Garde l\'emporte. Rappel : le duel ignore vitesse/portée/couvert,');
console.log('    donc il isole le rapport stats brut, pas le jeu réel.\n');
