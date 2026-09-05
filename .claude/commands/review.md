---
description: Revue complète des changements en cours (conventions, tests, maintenabilité, cohérence système).
---

# /review

Revue complète du diff courant d'Escarmouche.

## 1. Contexte

- Lire `CLAUDE.md`.
- Récupérer le périmètre : `git diff`, `git diff --cached`, `git status`, `git log --oneline -5`.
- **S'il n'y a aucun changement, s'arrêter** et le dire.

## 2. Vérifications, point par point

### Conventions (voir `CLAUDE.md`)
- Aucun `document`/`window`/`canvas`/`Math.random`/`Date.now`/`performance.now` introduit dans `src/rules/`.
- Aucune valeur magique hors `src/config.js` (hors invariants structurels et coefficients d'algorithme).
- `src/rules/` n'importe pas `render/`, `input/`, `loop/`.
- Le hasard des règles passe par `rng` injecté ; l'aléa cosmétique reste dans le rendu.
- Pas de nouvelle variable de module mutable partagée hors de l'objet `state`.
- Direction des dépendances respectée (skill **architecture**).

### Couverture de tests
- Toute règle ajoutée/modifiée dans `src/rules/` a un macro-test correspondant dans `tests/`.
- Les tests s'énoncent en comportement de jeu, pas en détail d'implémentation.

### Maintenabilité
- Couplage, responsabilité unique, duplication, longueur/complexité des fonctions, nommage,
  valeurs magiques.

### Cohérence système
- Intégration avec le code existant, forme de l'état (objet `state`), respect des patterns
  établis (décision pure vs effet).
- Si une règle affichée dans le bloc `.legend` d'`index.html` a changé, le texte est-il resté exact ?

## 3. Tests

Lancer `npm test` et rapporter le résultat.

## 4. Rapport

Un statut par point (**OK / VIOLATION / N/A**) avec fichier:ligne pour chaque violation,
puis un **verdict global**.
