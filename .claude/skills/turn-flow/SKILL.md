---
name: turn-flow
description: Use when touching the game state shape, activation flow, turn/side transitions, selection, or victory conditions.
auto_invoke: true
---

# Déroulé du tour et état

L'état mutable partagé et l'orchestration du tour. Les **décisions** (changer de camp,
nouveau tour, vainqueur) sont pures et vivent dans `src/rules/turn.js` ; les **effets** (DOM,
son, sélection, rafraîchissement) restent dans `src/loop/turn.js`.

## État partagé — `src/state/game.js`

Objet `state` unique, seul dépôt des variables mutables partagées :

| Champ | Sens |
| --- | --- |
| `turn` | numéro du tour (1..`MAXTURN`) |
| `side` | camp actif (`'A'` / `'B'`) |
| `selected` | figurine sélectionnée ou `null` |
| `busy` | verrou pendant la résolution d'un tir |
| `over` | partie terminée |
| `drag` | déplacement en cours `{m, to, chk}` |
| `hoverModel` | figurine sous le curseur |
| `undoState` | instantané pour annuler un déplacement |
| `pending` | tir déclaré en attente `{shooter, target, s}` |
| `speed` | multiplicateur d'animation |
| `shake` | intensité du tremblement d'écran |
| `models` | toutes les figurines (rempli par `main` via `createModels`) |
| `rng` | générateur à graine (injecté par `main`) |

Données figées : `TEAMS`, `TERRAIN`. Fabrique de l'effectif : `createModels()`.

## Orchestration — `src/loop/turn.js`

| Action | Fonction | Décision pure appelée |
| --- | --- | --- |
| Après une action (plus de PA ?) | `afterAction(m)` | — |
| Fin d'activation | `endActivation()` | `decideActivationEnd(models, side)` |
| Annonce de camp | `announceSide(sub)` | — |
| Nouveau tour (réactive tout le monde) | `newTurn()` | — |
| Sélection auto de la prochaine figurine | `autoSelect()` | — |
| Détecter l'anéantissement | `checkEnd()` | `annihilationWinner(models)` |
| Terminer la partie | `finish(forced)` | `attritionWinner(models)` |
| Sélectionner | `select(m)` | — |

## Modifier le déroulé du tour

1. Si c'est une **décision** (qui joue ensuite, qui gagne, la partie est-elle finie), l'écrire
   ou la modifier dans `src/rules/turn.js` comme fonction pure, avec un test dans
   `tests/turn.test.js`.
2. Brancher l'effet correspondant (DOM, son, `select`, `refresh`) dans `src/loop/turn.js`.
3. Nouveau champ d'état ? l'ajouter à l'objet `state` de `state/game.js` (jamais une variable
   de module isolée). Nouvelle figurine / stat de départ ? `createModels()`.
4. Toute valeur réglable (nombre de tours, seuils) → `src/config.js`.
5. `npm test` vert avant de finir.
