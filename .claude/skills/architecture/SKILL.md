---
name: architecture
description: Use when you need the module map of Escarmouche, the dependency direction between layers, or to decide where a new piece of code belongs.
auto_invoke: true
---

# Architecture d'Escarmouche

Séparation stricte **logique pure ↔ orchestration/effets** autour d'un objet `state` mutable
partagé. La dépendance ne pointe que vers le haut du tableau.

## Carte des modules

| Module | Rôle | Dépend de |
| --- | --- | --- |
| `src/config.js` | toutes les constantes nommées (dimensions, seuils, durées, couleurs de règle) | rien |
| `src/canvas.js` | `cv`, `ctx`, conversion pouces→pixels `px` | `config` |
| `src/rules/rng.js` | générateur pseudo-aléatoire à graine `createRng` | rien |
| `src/rules/geometry.js` | `dist`, `inflate`, `pointInRect`, `distPointRect`, `segSegT`, `segRectT` | `config` |
| `src/rules/squad.js` | `aliveOf`, `remaining` | rien |
| `src/rules/sight.js` | `sight`, `canShoot` | `config`, `geometry` |
| `src/rules/movement.js` | `moveCheck` | `config`, `geometry` |
| `src/rules/turn.js` | `decideActivationEnd`, `annihilationWinner`, `attritionWinner` | rien |
| `src/rules/combat.js` | `isCrit`, `isHit`, `isSave`, `effectiveBs`, `resolveShot` | `config` |
| `src/state/game.js` | `TEAMS`, `TERRAIN`, `createModels`, objet `state` mutable | `config` |
| `src/render/fx.js` | effets éphémères `addFx`, `drawFx` | `canvas` |
| `src/render/board.js` | plateau, figurines, lignes de vue/tir, texture `mat` | `config`, `canvas`, `state`, `audio`, `rules/sight` |
| `src/render/ui.js` | panneau latéral, journal, cartes, bandeau (`refresh`, `journal`) | `config`, `state`, `rules/squad`, `loop/turn` |
| `src/input/controls.js` | souris, clavier, boutons, `toast` | `config`, `canvas`, `state`, règles, `loop/*`, `render/ui` |
| `src/loop/render-loop.js` | boucle `requestAnimationFrame` (`render`) | `canvas`, `config`, `state`, `render/board`, `render/fx` |
| `src/loop/turn.js` | déroulé du tour (`endActivation`, `newTurn`, `finish`, `select`, `autoSelect`, `checkEnd`, `afterAction`) | `config`, `state`, `rules/turn`, `rules/squad`, `audio`, `render/ui` |
| `src/loop/combat.js` | séquence de tir animée (`declareShot`, `fire`, `throwDice`, `endShot`) | `config`, `state`, `rules/combat`, `audio`, `render/fx`, `render/ui`, `loop/turn` |
| `src/audio.js` | synthèse sonore (`sfx`, `audio`, `tone`) | rien |
| `src/main.js` | câblage, graine, démarrage | tout |

L'état mutable partagé (`turn`, `side`, `selected`, `busy`, `over`, `drag`, `hoverModel`,
`undoState`, `pending`, `speed`, `shake`, `models`, `rng`) vit **uniquement** dans l'objet
`state` de `state/game.js`. `fx` et `events` restent privés à leur module de rendu.

## Où va le nouveau code, par type de changement

| Changement | Où |
| --- | --- |
| Nouvelle valeur réglable (durée, seuil, dimension) | `src/config.js` |
| Nouvelle règle pure (décision, calcul, transition) | `src/rules/<sujet>.js` + un test dans `tests/` |
| Nouveau champ d'état ou nouvelle figurine | `src/state/game.js` (objet `state` / `createModels`) |
| Nouveau dessin sur le plateau | `src/render/board.js` (ou `fx.js` pour un effet éphémère), appelé depuis `render-loop.js` |
| Nouvel élément du panneau latéral | `src/render/ui.js` |
| Nouvelle interaction souris/clavier/bouton | `src/input/controls.js` |
| Nouvelle étape de déroulé de tour | `src/loop/turn.js` (décision pure → `src/rules/turn.js`) |
| Nouvelle mécanique de tir/animation | `src/loop/combat.js` (calcul pur → `src/rules/combat.js`) |
| Nouveau son | `src/audio.js` (objet `sfx`) |

Règle d'or : la **décision** va dans `rules/`, l'**effet** (DOM, canvas, son, temps) reste
dans `render/`, `input/` ou `loop/`. Si une fonction ne peut pas être pure, ce n'est pas une
règle : c'est de l'orchestration.
