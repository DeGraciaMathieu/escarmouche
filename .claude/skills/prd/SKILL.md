---
name: prd
description: Use when writing a specification for an Escarmouche feature before implementing it — explores the code, asks only product decisions, produces a PRD, writes no code.
auto_invoke: false
user_invocable: true
---

# Rédiger un PRD

Produit une **spécification**, n'implémente rien.

## Démarche

1. Explorer le code existant (skill **architecture**) pour remplir la base technique :
   quelles règles, quel état, quelles couches sont touchées.
2. Ne poser que les **décisions produit** que le code ne tranche pas (valeurs de jeu voulues,
   interactions attendues, portée fonctionnelle). Les faits techniques se déduisent du code.
3. Écrire le PRD dans le format fixe ci-dessous. Aucune modification de code.

## Format

```
# PRD — <titre>

## Objectif
Une à trois phrases : le résultat visé côté jeu.

## Base technique
Ce qui existe déjà et qui est concerné (fichiers, règles, champs d'état), déduit du code.

## Comportement
Ce que le jeu doit faire, en vocabulaire de domaine (figurines, PA, dés, couvert, tours).

## Hors périmètre
Ce qui n'est explicitement pas traité.

## Impact par couche
- config : constantes à ajouter/changer
- rules : décisions pures à créer/modifier
- state : champs / figurines
- render : dessins, panneau
- input : interactions
- loop : orchestration

## Critères d'acceptation
Liste vérifiable de comportements observables.

## Tests
Les macro-tests à écrire (fichier + affirmation), avant/après.

## Risques et questions ouvertes
Ce que le code ne tranche pas et qui reste à décider — jamais résolu par supposition.
```
