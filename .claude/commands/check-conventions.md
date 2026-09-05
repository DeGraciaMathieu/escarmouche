---
description: Vérification légère des conventions, de la cohérence tests/doc, et exécution des tests.
---

# /check-conventions

Contrôle ciblé du diff courant d'Escarmouche.

## 1. Contexte

- Lire `CLAUDE.md`.
- Périmètre : `git diff`, `git diff --cached`, `git status`, `git log --oneline -5`.
- **Aucun changement → s'arrêter.**

## 2. Conventions

- `src/rules/` reste pur : pas de DOM, pas de `Math.random`/`Date.now`/`performance.now`,
  pas d'import de `render/`/`input/`/`loop/`.
- Aucune valeur magique hors `src/config.js` (hors invariants structurels / coefficients LCG).
- État mutable partagé uniquement dans l'objet `state`.
- Style ESM, 2 espaces, français pour commentaires et textes de jeu.

## 3. Cohérence tests / doc

- Règle modifiée → test correspondant présent et à jour dans `tests/`.
- Bloc `.legend` d'`index.html` toujours exact si une règle affichée a changé
  (`6 = critique`, `une sauvegarde annule une touche, deux annulent une critique`, `tour sur 4`).

## 4. Tests

`npm test` et rapport du résultat.

## 5. Rapport

Statut par point (**OK / VIOLATION / N/A**) + verdict global.
