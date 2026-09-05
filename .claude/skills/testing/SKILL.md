---
name: testing
description: Use when writing, running, or reviewing tests — to know the command, the macro-test philosophy, and where each test belongs.
auto_invoke: true
---

# Tests

- **Commande** : `npm test` (`node --test`). Veille : `npm run test:watch`. Node ≥ 22, aucune
  dépendance de test — `node:test` + `node:assert/strict`.
- Seules les **règles pures** (`src/rules/`) sont testées. Le rendu, l'entrée et
  l'orchestration ne le sont pas : c'est le signe que la logique testable a bien été extraite.

## Philosophie : macro-tests, pas de tests d'implémentation

Tester ce qu'un joueur remarque, dans le vocabulaire du jeu.

- Bon : « une sauvegarde annule une touche », « on ne peut pas se déplacer sur une case
  occupée », « une escouade anéantie donne la victoire à l'autre ».
- Mauvais : « `resolveShot` renvoie `survivingCrits === 1` par construction interne »,
  « le tableau interne a une longueur 3 ».

Construire l'état d'entrée avec un petit littéral explicite, pas un helper qui cache le
montage. Viser un à deux tests par règle : le cas nominal et le cas limite qui justifie la
règle. Le pourcentage de couverture n'est pas un objectif.

## Fichier de test → périmètre couvert

| Fichier | Couvre |
| --- | --- |
| `tests/geometry.test.js` | distance, intersection segment/rectangle, point dans rectangle |
| `tests/squad.test.js` | figurines vivantes, figurines restant à activer |
| `tests/sight.test.js` | mur bloquant, couvert de décor bas, portée, arme lourde |
| `tests/movement.test.js` | portée de mouvement, place occupée, décor sur le trajet |
| `tests/turn.test.js` | changement de camp, nouveau tour, victoire, match nul |
| `tests/combat.test.js` | seuils, sauvegardes/annulations, couvert, critiques, visée |
| `tests/loadout.test.js` | armes autorisées par rôle, arme hors-rôle refusée |

## Où mettre un nouveau test

- Une règle dans `src/rules/<sujet>.js` → un test dans `tests/<sujet>.test.js`.
- Importer la fonction pure directement (`import { ... } from '../src/rules/<sujet>.js'`).
- Ne jamais importer `render/`, `input/`, `loop/` ni toucher au DOM dans un test — si le
  besoin s'en fait sentir, c'est que la logique n'est pas assez pure : la corriger d'abord.
- Injecter une graine fixe via `createRng(seed)` pour tout ce qui dépend du hasard, afin
  d'obtenir un résultat déterministe.
