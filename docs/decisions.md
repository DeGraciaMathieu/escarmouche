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
| `dist`, `inflate`, `pointInRect`, `segSegT`, `segRectT` | `rules/geometry.js` | `tests/geometry.test.js` | primitives géométriques pures |
| `aliveOf`, `remaining` | `rules/squad.js` | `tests/squad.test.js` | `models` passé en argument |
| `sight`, `canShoot` | `rules/sight.js` | `tests/sight.test.js` | `terrain` passé en argument |
| `moveCheck` | `rules/movement.js` | `tests/movement.test.js` | `models` + `terrain` passés en argument |
| `decideActivationEnd`, `annihilationWinner`, `attritionWinner` | `rules/turn.js` | `tests/turn.test.js` | décisions pures ; les effets DOM restent dans `loop/turn.js` |
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
- **Armes sans portée** (`Fusil de combat`, `Carabine`) : aucune propriété `range`, donc
  portée illimitée. Comportement d'origine conservé (voir Questions ouvertes).
- **Facteur de marge de collision `0.92`** (`TERRAIN_MARGIN_FACTOR`) : valeur empirique non
  commentée à l'origine ; extraite en constante mais non modifiée.

## Open questions

Décisions que le code ne tranche pas et qui n'ont pas été prises. Jamais résolues par
supposition.

- L'ordre de `autoSelect` en cas de plusieurs figurines éligibles est-il voulu, ou faut-il
  une priorité explicite (meneur d'abord, plus proche, etc.) ?
- L'absence de `range` sur certaines armes est-elle intentionnelle (portée illimitée) ou une
  valeur manquante à combler ?
- L'origine du facteur `0.92` de marge de collision : empirique ? à documenter ou paramétrer ?
