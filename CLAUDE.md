# Escarmouche

Jeu d'escarmouche tactique au tour par tour sur un plateau continu (positions en pouces),
rendu sur canvas. Deux escouades s'affrontent sur quatre tours en activation alternée :
déplacement, visée, tir résolu aux dés.

## Stack

- **Runtime** : Node ≥ 22, ESM natif, **zéro build** (aucun bundler, aucun transpileur).
- **Aucune dépendance** runtime ni dev.
- `npm run dev` — sert le dossier (`npx serve .`). ⚠️ Le jeu **ne s'ouvre plus en double-clic** :
  l'ESM natif ne se charge pas via `file://`.
- `npm test` — lance les tests (`node --test`). `npm run test:watch` pour le mode veille.
- Pas de linter ni de formateur configurés (choix assumé — voir `docs/decisions.md`).

## Architecture

Séparation stricte **logique pure ↔ orchestration/effets**, autour d'un unique objet `state`
mutable partagé (`src/state/game.js`).

| Couche | Dossier | Rôle | Peut importer |
| --- | --- | --- | --- |
| config | `src/config.js` | toutes les constantes nommées | rien |
| règles | `src/rules/` | décisions pures et transitions | `config`, autres règles |
| état | `src/state/game.js` | données, fabrique, objet `state` | `config` |
| rendu | `src/render/` | tout ce qui écrit à l'écran | `config`, `canvas`, `state`, règles (lecture) |
| entrée | `src/input/` | souris, clavier, boutons → intentions | `config`, `canvas`, `state`, règles, `loop`, `render` |
| boucle | `src/loop/` | orchestration : intention → règle → état → rendu | tout le reste |
| entrée programme | `src/main.js` | câblage, graine du hasard, démarrage | tout |

La flèche de dépendance ne pointe que vers le haut de ce tableau.

## Conventions de code — non négociables

- **Aucun DOM, aucun `Math.random`/`Date.now`/`performance.now` dans `src/rules/`.** Une
  règle prend des données en argument et renvoie une décision ou un nouvel état ; elle ne
  mute pas ses arguments et donne le même résultat pour les mêmes entrées.
- **Aucune valeur magique hors `src/config.js`.** Toute durée, seuil, dimension, couleur liée
  à une règle, décalage d'animation ou fréquence sonore réglable est une constante nommée
  exportée par `config.js`. Les seules exceptions tolérées sont les invariants structurels
  (4 côtés d'un rectangle, grille 3×3 d'un dé) et les coefficients d'algorithme (LCG du RNG).
- **Le hasard est injecté.** Les règles reçoivent `rng` (via `state.rng()`) ; seule `main.js`
  décide la graine. L'aléa purement cosmétique (texture, tremblement, sons, jitter) reste sur
  `Math.random` dans les couches de rendu.
- **`src/rules/` n'importe jamais `render/`, `input/` ni `loop/`.**
- L'état mutable partagé vit dans `state` (objet de `state/game.js`) ; on ne réintroduit pas
  de variable de module mutable partagée entre fichiers.
- Style : 2 espaces, `import`/`export` ESM, français pour les commentaires et les textes de jeu.

## Conventions de domaine

- Distances et portées en **pouces** ; conversion en pixels par `px()` (`src/canvas.js`).
- Une figurine est un objet plat (voir `createModels` dans `state/game.js`) : `hp`, `ap`,
  `activated`, `aimed`, `moved`, `shot`, `weapon`, `role`, etc. Pas de classes.
- Les armes vivent dans le catalogue `WEAPONS` (`state/game.js`) ; `ROLE_LOADOUTS` fixe
  l'ensemble autorisé par rôle. `m.weapon` référence une entrée du catalogue (lecture seule).
  La validation d'un choix d'arme est une règle pure (`rules/loadout.js`).
- Résolution des dés : **6 = critique**, une sauvegarde annule une touche, deux sauvegardes
  (ou une sauvegarde critique) annulent une critique, le couvert offre un dé de plus. Ces
  règles vivent dans `src/rules/combat.js` (`resolveShot`) et nulle part ailleurs.

## Comportement (règles de process)

- Ne jamais déclarer une tâche terminée sans avoir lancé les tests et vérifié qu'ils passent
  (`npm test`).
- Si une approche échoue deux fois, revoir le plan avant de retenter une troisième variante.
- Implémenter uniquement ce qui est demandé ; consigner ce que le code ne tranche pas dans
  `docs/decisions.md` plutôt que de deviner.
- Après une modification, mettre à jour `CLAUDE.md`, les skills et la documentation en jeu
  (le bloc `.legend` d'`index.html`) si le périmètre a bougé.

## Skills disponibles

- **architecture** — carte des modules et « où va le nouveau code ».
- **rules** — couche de règles pures (`geometry`, `sight`, `movement`, `turn`, `combat`, `squad`, `loadout`).
- **combat** — résolution du tir (dés, seuils, annulations, dégâts) et séquence animée.
- **rendering** — dessin du plateau, des figurines, des effets et boucle de rendu.
- **turn-flow** — état partagé, activation, transitions de tour/camp, victoire.
- **testing** — commande, philosophie macro, mapping test → périmètre.
- **feature** — implémenter une fonctionnalité de bout en bout dans l'architecture.
- **prd** — rédiger une spécification sans implémenter.
