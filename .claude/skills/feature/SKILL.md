---
name: feature
description: Use when implementing a new gameplay feature or change in Escarmouche end to end, from understanding to green tests.
auto_invoke: false
user_invocable: true
---

# Implémenter une fonctionnalité

Boucle complète, dans l'architecture d'Escarmouche et les règles de `CLAUDE.md`.

## 1. Comprendre

- Reformuler la demande en une phrase.
- Invoquer le skill **architecture** pour situer la couche concernée (règle ? état ? rendu ?
  entrée ? orchestration ?).
- Poser les questions qui bloquent l'implémentation, en particulier :
  - **valeurs numériques** (portées, seuils, durées, nombre de dés) ;
  - **interactions** avec l'existant (activation, PA, visée, couvert, arme lourde…) ;
  - **cas limites** (figurine morte, hors portée, plus de PA, dernier tour).
- Ne rien inventer que le code ne tranche pas : consigner dans `docs/decisions.md`.

## 2. Implémenter

- **Décision** → `src/rules/<sujet>.js` (fonction pure, données en argument, `rng` injecté).
- **Valeur réglable** → `src/config.js` (jamais de magic value ailleurs).
- **Champ d'état / figurine** → objet `state` ou `createModels` (`src/state/game.js`).
- **Effet** (DOM, canvas, son, animation, temps) → `render/`, `input/` ou `loop/`.
- Respecter la direction des dépendances (skill **architecture**). Une règle n'importe jamais
  `render/`, `input/`, `loop/`.

## 3. Tester

- Ajouter/mettre à jour un macro-test dans `tests/<sujet>.test.js` (skill **testing**) :
  une affirmation de comportement, pas un détail d'implémentation.
- `npm test` jusqu'au vert. Si une approche échoue deux fois, revoir le plan avant d'insister.

## 4. Mettre à jour la documentation

- Si le périmètre a bougé : mettre à jour `CLAUDE.md`, le(s) skill(s) concerné(s) et le bloc
  `.legend` d'`index.html` s'il décrit désormais une règle inexacte (le hook doc-sync le
  vérifiera).

## 5. Résumer

Lister les fichiers modifiés, les tests ajoutés, et le résultat (`npm test` vert).
