# Refactor decisions

Écrit par `/refactor-game`. Consigne ce que le code ne peut pas exprimer : pourquoi ce
découpage, pourquoi cette chaîne d'outils, ce qui n'a délibérément pas été touché, ce qui
reste indécis.

Lu par `/scaffold-claude` pour ne pas avoir à le redéduire.

## Archetype

Selected: `Turn-based board` (#2)
Why: tours discrets, une action à la fois (points d'action / activation), ligne de vue,
résolution de combat aux dés, transitions de tour/camp, condition de victoire.
Does not fit :
- Le plateau **n'est pas une grille discrète** : positions flottantes `x,y` en pouces,
  distance euclidienne, mouvement continu contraint par collision de socle.
- Le rendu est **canvas temps-réel** (`requestAnimationFrame`) avec des animations
  empruntées à l'archétype temps-réel : interpolation de déplacement, tremblement d'écran,
  spin des dés, effets visuels à durée de vie basée sur `performance.now()`. `loop/` ne se
  réduit donc pas à un contrôleur de tour minimal : il garde une vraie boucle rAF.

## Toolchain

Branch: `zero-build`
Triggering signal: aucun signal Vite présent — pas de package npm importé (seulement Google
Fonts), pas de TypeScript, pas d'assets à bundler, et le prototype fait ~1100 lignes
(< 2000 lignes de JS).
Node: 22
Test runner: `node:test`

## Layout

| Module | Responsibility | Came from |
| --- | --- | --- |
| `src/config.js` | toutes les valeurs magiques (dimensions, seuils, durées) | consts éparses du prototype |
| `src/canvas.js` | `cv`, `ctx` et le convertisseur pouces→pixels `px` | lignes 261-262, 287 |
| `src/rules/rng.js` | générateur pseudo-aléatoire à graine | nouveau (dé-randomisation) |
| `src/rules/geometry.js` | `dist`, `inflate`, `pointInRect`, `segSegT`, `segRectT` | lignes 305-320 |
| `src/rules/squad.js` | `aliveOf`, `remaining` | lignes 967-968 |
| `src/rules/sight.js` | `sight`, `canShoot` | lignes 338-357 |
| `src/rules/movement.js` | `moveCheck` | lignes 322-336 |
| `src/rules/turn.js` | `decideActivationEnd`, `annihilationWinner`, `attritionWinner` | lignes 935-983 (part pure) |
| `src/rules/combat.js` | `isCrit`, `isHit`, `isSave`, `effectiveBs`, `resolveShot` | lignes 761-898 (part pure) |
| `src/state/game.js` | données `TEAMS`/`TERRAIN`, fabrique `createModels`, objet `state` mutable | lignes 264-325 |
| `src/render/fx.js` | effets visuels éphémères (`addFx`, `drawFx`) | lignes 404-454 |
| `src/render/board.js` | dessin du plateau, des figurines, des lignes de vue/tir | lignes 459-635 |
| `src/render/ui.js` | panneau latéral, journal, cartes, bandeau (`refresh`, `journal`) | lignes 994-1031 |
| `src/input/controls.js` | souris, clavier, boutons d'action, `toast` | lignes 624-679, 1032-1070 |
| `src/loop/render-loop.js` | boucle `requestAnimationFrame` | lignes 637-651 |
| `src/loop/turn.js` | déroulé du tour (`endActivation`, `newTurn`, `finish`, `select`…) | lignes 934-989 |
| `src/loop/combat.js` | séquence de tir animée (`declareShot`, `fire`, `throwDice`, `endShot`) | lignes 705-903 |
| `src/main.js` | câblage, graine du hasard, démarrage | lignes 1072-1073 |

Note : les couches impures partagent un unique objet `state` (state/game.js) plutôt que des
variables de module — nécessaire car l'ESM ne permet pas de réassigner un binding importé
depuis un autre module. `audio.js` et `canvas.js` sont des modules ajoutés hors arbre
d'archétype (son et contexte canvas) : feuilles sans dépendance de jeu.

## Rules extracted

| Rule | Module | Test | Notes |
| --- | --- | --- | --- |
| `dist`, `inflate`, `pointInRect`, `distPointRect`, `segSegT`, `segRectT` | `rules/geometry.js` | `tests/geometry.test.js` | primitives géométriques pures |
| `aliveOf`, `remaining` | `rules/squad.js` | `tests/squad.test.js` | `models` passé en argument |
| `sight`, `canShoot` | `rules/sight.js` | `tests/sight.test.js` | `terrain` passé en argument |
| `moveCheck` | `rules/movement.js` | `tests/movement.test.js` | `models` + `terrain` passés en argument |
| `decideActivationEnd`, `engagedModel`, `annihilationWinner`, `attritionWinner` | `rules/turn.js` | `tests/turn.test.js` | décisions pures ; les effets DOM restent dans `loop/turn.js` |
| `isCrit`, `isHit`, `isSave`, `effectiveBs`, `resolveShot` | `rules/combat.js` | `tests/combat.test.js` | `fire()` consomme les comptes de `resolveShot` pour l'animation |

## Randomness and time

| Call site | Classification | Handling |
| --- | --- | --- |
| valeur finale des dés (`throwDice`) | rule-bearing | RNG à graine injecté (`state.rng()`) |
| faces affichées pendant le spin des dés | cosmetic | laissé sur `Math.random` |
| grain de texture du tapis (`render/board.js`) | cosmetic | laissé sur `Math.random` |
| tremblement d'écran (`render-loop`) | cosmetic | laissé sur `Math.random` |
| position/`seed` des impacts, jitter de position des dés | cosmetic | laissé sur `Math.random` |
| délais et fréquences des sons (`audio.js`) | cosmetic | laissé sur `Math.random` |
| `performance.now()` (animations, effets, pulse, ligne de tir) | cosmetic | laissé dans render/loop |

Seed: `from Date.now()` — décidée uniquement dans `main.js`. Les règles ne lisent jamais
l'horloge ; aucun `dt` n'a été nécessaire (le combat est séquentiel, piloté par `sleep`).

## Deliberately left alone

Comportement qui pourrait sembler perfectible mais a été préservé, car le refactor ne doit
pas changer le jeu.

- **Sélection automatique de cible / d'activation** (`autoSelect`, `loop/turn.js`) : l'ordre
  dépend de l'ordre interne du tableau `models`, sans critère de priorité explicite.
  Conservé tel quel.
- **Armes sans portée** (`Canon long`) : aucune propriété `range`, donc portée illimitée.
  Comportement d'origine conservé (voir Questions ouvertes).
- **Armes de la ligne** : le `Fusil de combat` (trop proche de la carabine et du fusil d'assaut)
  a été retiré ; la ligne choisit désormais entre `Carabine` (volume à courte portée : `a6`,
  `bs4`, `dn2/dc3`, 10″) et `Fusil d'assaut` (peu de tirs mais lourds à moyenne portée : `a3`,
  `bs3`, `dn4/dc5`, 20″), deux profils volontairement opposés.
- **Facteur de marge de collision `0.92`** (`TERRAIN_MARGIN_FACTOR`) : valeur empirique non
  commentée à l'origine ; extraite en constante mais non modifiée.
- **Skins de décor** : le `variant` est purement cosmétique (rendu seulement) ; les règles
  n'y touchent pas. Les plans existants (`classique`, `secteur`) sont habillés via `skin()` sur
  leurs rects d'origine pour **préserver leur géométrie équilibrée** ; le nouveau plan
  `avantPoste` est composé de pièces via `place()`. Le skin `tank` est posé sur un rect `wall`
  (une cuve est un bloqueur de vue). La rotation des pièces n'est pas gérée (gabarits posés tels
  quels). Palettes de skin laissées dans `render/board.js` (cosmétiques), comme les couleurs de
  décor d'origine.

## Système de points (objectifs + éliminations)

- **Catégories retenues** : éliminations et contrôle de zone (le « territoire ennemi » a été
  écarté pour cette première version).
- **Modèle de zone** : marqueurs d'objectif ponctuels, contrôlés à la majorité de figurines à
  portée (`OBJECTIVE_RANGE`), fidèle à Kill Team. Alternative écartée : une zone centrale unique.
- **Cadence** : score de zone marqué **en fin de chaque tour**, kills crédités à l'instant ;
  vainqueur = plus grand total en fin de tour 4.
- **Victoire aux points remplace l'attrition** : `attritionWinner` (survivants puis PV cumulés)
  est supprimé au profit de `scoreWinner` (total le plus élevé). Égalité de points = match nul,
  **sans départage secondaire**. L'anéantissement reste une victoire immédiate.
- **Positions des objectifs** : liste fixe `OBJECTIVES` en config, **indépendante du plan** de
  décor, disposée symétriquement autour de l'axe vertical (fairness camp A gauche / B droite) et
  choisie pour rester dans des zones dégagées des trois plans existants. Non paramétrable par
  plan (pas demandé) ; le marqueur central peut jouxter un décor selon le plan — les valeurs sont
  des constantes nommées, ajustables.
- **Barème** : `KILL_POINTS` et `OBJECTIVE_POINTS` valent 1 (valeurs de départ, à équilibrer).
  Une auto-élimination par surchauffe ne rapporte de point à personne.
- **IA** : non modifiée — l'IA ne cherche pas encore les objectifs, mais ses kills et sa présence
  sur un marqueur comptent normalement (mêmes actions et même décompte de fin de tour).

## Open questions

Décisions que le code ne tranche pas et qui n'ont pas été prises. Jamais résolues par
supposition.

- L'ordre de `autoSelect` en cas de plusieurs figurines éligibles est-il voulu, ou faut-il
  une priorité explicite (meneur d'abord, plus proche, etc.) ?
- L'absence de `range` sur certaines armes est-elle intentionnelle (portée illimitée) ou une
  valeur manquante à combler ?
- L'origine du facteur `0.92` de marge de collision : empirique ? à documenter ou paramétrer ?
