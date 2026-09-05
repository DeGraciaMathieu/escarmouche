---
name: rules
description: Use when adding or changing game logic (movement legality, line of sight, turn/victory decisions, dice resolution, squad counts) — anything that must stay pure and testable.
auto_invoke: true
---

# Couche de règles

`src/rules/` contient les **décisions pures** du jeu. Contrat, sans exception :

1. Aucun `document`, `window`, `canvas`, aucun nœud DOM en entrée ni en sortie.
2. Aucun `Math.random`, `Date.now`, `performance.now`.
3. Aucune mutation des arguments : on prend un état, on renvoie une décision ou un nouvel état.
4. Import autorisé : `config.js` et d'autres règles uniquement.
5. Mêmes entrées → mêmes sorties, dans n'importe quel ordre.

Si une fonction ne peut pas respecter 1–5, ce n'est pas une règle : elle va dans `loop/` ou
`input/`.

## Concept de domaine → implémentation

| Concept | Fichier | Fonction |
| --- | --- | --- |
| Distance / géométrie du plateau | `rules/geometry.js` | `dist`, `inflate`, `pointInRect`, `segSegT`, `segRectT` |
| Effectif d'une escouade | `rules/squad.js` | `aliveOf(models, t)`, `remaining(models, t)` |
| Ligne de vue, couvert | `rules/sight.js` | `sight(a, b, terrain)` |
| Peut-on cibler (camp, PA, tir, ligne de vue — sans l'arme) | `rules/sight.js` | `canTarget(m, target, terrain)` |
| Une arme peut-elle faire feu (portée, arme lourde) | `rules/sight.js` | `weaponCanFire(weapon, moved, s)` |
| Peut-on tirer avec l'arme équipée (compose les deux) | `rules/sight.js` | `canShoot(m, target, terrain)` |
| Déplacement légal (portée, bords, décor, collision) | `rules/movement.js` | `moveCheck(m, to, models, terrain)` |
| Fin d'activation : changer de camp / nouveau tour / enchaîner | `rules/turn.js` | `decideActivationEnd(models, side)` |
| Victoire par anéantissement | `rules/turn.js` | `annihilationWinner(models)` |
| Victoire aux points en fin de partie | `rules/turn.js` | `attritionWinner(models)` |
| Classement d'un dé (touche / critique / sauvegarde) | `rules/combat.js` | `isCrit`, `isHit`, `isSave` |
| Seuil de touche après visée | `rules/combat.js` | `effectiveBs(bs, aimed)` |
| Résolution complète d'un tir (annulations, dégâts) | `rules/combat.js` | `resolveShot({...})` |
| Armes autorisées par rôle (loadout) | `rules/loadout.js` | `weaponsForRole(role, loadouts)`, `isWeaponAllowed(role, key, loadouts)` |
| Hasard à graine | `rules/rng.js` | `createRng(seed)` |

Les données mutables (`models`, `terrain`) sont **passées en argument**, jamais lues depuis
un global. C'est ce qui rend chaque règle testable en isolation.

## Ajouter une nouvelle règle

1. Choisir le fichier de `src/rules/` correspondant au sujet (ou en créer un si le sujet est
   nouveau : nom au singulier, ex. `deployment.js`).
2. Écrire une fonction pure : entrées explicites (état + `config`), sortie = décision ou
   nouvel état. Si elle a besoin de hasard, prendre `rng` en argument (jamais `Math.random`).
3. Sortir toute valeur réglable dans `src/config.js` et l'importer.
4. Écrire son macro-test dans `tests/<sujet>.test.js` : une affirmation de comportement du
   jeu, pas de détail d'implémentation (voir le skill **testing**).
5. Brancher la règle depuis la couche d'orchestration (`loop/` ou `input/`), qui garde les
   effets (DOM, son, animation).
6. `npm test` doit être vert avant de considérer la règle terminée.

## Piège classique

Une règle qui importe un module de `render/`, `input/` ou `loop/` est une erreur : la
dépendance ne va que vers `config` et d'autres règles. Vérifie-le après chaque ajout.
