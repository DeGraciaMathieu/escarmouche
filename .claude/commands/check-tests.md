---
description: Analyse la couverture des règles, propose les macro-tests manquants, attend l'accord avant de les écrire, puis relance la suite.
---

# /check-tests

Analyse et complète la couverture de tests d'Escarmouche.

## 1. Contexte

- Lire `CLAUDE.md` et le skill **testing**.
- Périmètre : `git diff`, `git diff --cached`, `git status`, `git log --oneline -5`.
- **Aucun changement → s'arrêter.**

## 2. Analyse de couverture

- Pour chaque règle ajoutée/modifiée dans `src/rules/`, vérifier qu'un macro-test couvre le
  cas nominal **et** le cas limite qui justifie la règle.
- Repérer les comportements de jeu non couverts (mapping fichier → périmètre du skill **testing**).

## 3. Proposition

- Lister les macro-tests manquants : fichier cible `tests/<sujet>.test.js` + affirmation de
  comportement (vocabulaire de jeu, pas d'implémentation).
- **S'arrêter et attendre l'accord de l'utilisateur avant d'écrire un seul test.**

## 4. Écriture puis run

- Après accord : écrire les tests approuvés (état monté par petit littéral explicite, graine
  fixe via `createRng` si besoin de hasard).
- Lancer `npm test` et rapporter le résultat.

## 5. Rapport

Tests ajoutés, périmètre nouvellement couvert, résultat de la suite.
