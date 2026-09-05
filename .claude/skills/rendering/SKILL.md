---
name: rendering
description: Use when drawing on the board — figurines, terrain, sight/firing lines, ephemeral effects — or touching the requestAnimationFrame loop.
auto_invoke: true
---

# Rendu (canvas)

Le rendu lit `state` et `config` et écrit sur le canvas. Il ne décide **rien** : aucune
logique de règle n'y vit. Le temps (`performance.now()`) et l'aléa cosmétique
(`Math.random`) sont autorisés ici, jamais dans `src/rules/`.

## Concept → implémentation

| Élément dessiné | Fichier | Fonction |
| --- | --- | --- |
| Contexte, conversion pouces→px | `src/canvas.js` | `cv`, `ctx`, `px` |
| Texture du tapis (pré-rendue) | `src/render/board.js` | `mat` (IIFE au chargement) |
| Décor | `src/render/board.js` | `drawTerrain` |
| Position animée d'une figurine | `src/render/board.js` | `modelPos` |
| Une figurine (socle, rôle, PV, halo) | `src/render/board.js` | `drawModel` |
| Réticules de cibles valides | `src/render/board.js` | `drawTargets` |
| Portée de déplacement / d'arme | `src/render/board.js` | `drawRange` |
| Ruban de déplacement (drag) | `src/render/board.js` | `drawTape` |
| Ligne de tir en attente | `src/render/board.js` | `drawFiringLine` |
| Ligne de vue au survol | `src/render/board.js` | `drawSight` |
| Étiquette de nom au survol | `src/render/board.js` | `drawHoverName` |
| Effets éphémères (traceur, impact, bouclier, texte flottant) | `src/render/fx.js` | `addFx`, `drawFx` |
| Teinte/aspect des tirs par arme (bouche, traçante, impact ; champ `weapon.tracer`) | `src/render/fx.js` | `TRACER_STYLES`, `tracerColor` |
| Boucle principale | `src/loop/render-loop.js` | `render` |
| Panneau latéral, journal, cartes, bandeau | `src/render/ui.js` | `refresh`, `journal` |

`render()` empile chaque frame dans l'ordre : tremblement → tapis → zones de déploiement →
décor → portée → ruban → réticules → figurines → ligne de tir → ligne de vue → nom → effets.
`board.js` peut appeler des règles **en lecture** (`canShoot`, `sight`) pour colorer les
indications ; il ne modifie jamais l'état de jeu (sauf effets purement visuels : `m.flash`,
clôture de `m.anim`).

## Ajouter un élément de rendu

1. Écrire la fonction de dessin dans `src/render/board.js` (élément persistant) ou via
   `addFx(...)` dans `src/render/fx.js` (effet à durée de vie).
2. Sortir toute couleur liée à une règle, dimension ou durée dans `src/config.js`. Les teintes
   purement esthétiques du dessin peuvent rester inline.
3. L'appeler depuis `render()` (`src/loop/render-loop.js`) à la bonne place dans l'ordre de
   dessin, ou depuis `refresh()` pour un élément du panneau latéral.
4. Ne lire l'état que via l'objet `state` ; ne rien y écrire qui relève d'une décision de jeu.
5. `npm test` vert (le rendu n'est pas testé, mais rien ne doit casser les règles).
