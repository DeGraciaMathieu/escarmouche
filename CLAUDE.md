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
| IA | `src/ai/` | décision et pilotage de l'IA (mode solo) | `config`, `state` (lecture), règles, `loop` |
| éditeur | `src/editor/` | création de map hors-jeu (dessin, validation, persistance) | `config`, `canvas`, `state`, `render`, règles |
| entrée programme | `src/main.js` | câblage, graine du hasard, démarrage | tout |

La flèche de dépendance ne pointe que vers le haut de ce tableau.

**IA = consommateur.** En mode 1 joueur, `src/ai/` pilote le camp B via les **mêmes actions**
qu'un humain (`loop/actions.js` : `moveModel`, `aim` ; + `declareShot`/`fire`,
`declareFight`/`fight`, `submitMeleeChoice`, `endActivation`). La décision est pure et à deux
niveaux : `ai/plan.js` (stratégique) assigne à chaque figurine un **but** — `{ kind:'seize', at }`
tenir/prendre un objectif, ou `{ kind:'attack' }` engager l'ennemi (`planSquad(state, side)`) ; puis
`ai/utility.js` (tactique) génère les actions candidates de la figurine et les **note**
(`{ priority, value }` : priorité la plus haute, puis départage tactique — dégâts attendus et
bonus d'« achever » au tir, préférence pour une destination à couvert au déplacement), la cible de
déplacement dépendant du but. `ai/plan.js` **coordonne** aussi l'escouade (assez de figurines par objectif, tempo de dernier
tour). `ai/decide.js` fait la colle : il **choisit l'ordre d'activation** (la figurine dont la
meilleure action a la plus haute utilité, sinon poursuit la figurine engagée) puis rend son action
(`decide(state, side) → intention`). Un ordonnanceur (`ai/runner.js`) observe `state` et agit à
son tour. Le cœur (`rules`/`state`/`render`) **ignore l'IA** ; `src/ai/` n'est
importé que par `main.js` (câblage) et par `input/` (qui consulte `isAiControlled` pour bloquer
la main humaine pendant le tour de l'IA).

**Éditeur = consommateur.** `src/editor/` est un module isolé sur le même modèle que l'IA :
importé par `main.js` (câblage), `input/controls.js` (qui consulte `isEditing` pour bloquer la main
de jeu) et `loop/render-loop.js` (qui délègue le rendu à `drawEditor` en mode édition). L'éditeur
manipule `state.terrain` comme brouillon et réutilise `drawTerrain`/`drawObjectives` ; la
**validité d'une map** (spawns/objectifs dégagés et mutuellement accessibles) est une **règle pure**
(`rules/mapcheck.js`). Les maps créées sont persistées en `localStorage` (`editor/storage.js`, format
`{ name, desc, terrain }` identique à une entrée `MAPS`) et exportables en code à coller dans `MAPS`.

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
- Le décor est un catalogue de plans `MAPS` (`state/game.js`) ; le joueur en choisit un à l'écran
  de démarrage (`main.js`) et il est copié dans `state.terrain` (le plan actif, lu partout). Un
  décor est un rectangle `{ x, y, w, h, t }` (`t` = `'wall'` bloquant ou `'low'` bas), avec un
  champ `variant` **purement cosmétique** en option (lu seulement par `drawTerrain`, ignoré des
  règles). Les plans s'assemblent à partir du catalogue de pièces `PIECES` via `place(key, x, y)`
  (ou du helper `skin(variant, ...rects)` pour habiller des rects écrits en dur). Ajouter un skin
  = une routine de rendu dans `render/board.js` (map `SKINS`), aucune règle touchée.
  On peut aussi **créer un plan à l'écran** (bouton « Créer une map », `src/editor/`) : il est
  stocké en `localStorage` et apparaît dans le sélecteur de démarrage, ou s'exporte en entrée `MAPS`
  à committer. Un plan (intégré ou personnalisé) est un objet `{ name, desc, terrain }`.
- Une figurine est un objet plat (voir `createModels` dans `state/game.js`) : `hp`, `ap`,
  `activated`, `aimed`, `moved`, `shot`, `weapon`, `role`, etc. Pas de classes.
- Rendu d'une figurine : un **jeton-photo circulaire** (« médaillon ») dessiné sur le canvas par
  `drawMedallion` (`render/board.js`) — photo cadrée (constantes `MEDAL_*` de `config.js`) sur fond
  clair, cerclée de la couleur du camp ; les halos, l'arc de PV, les pips d'AP et la coche
  « a agi » restent gérés par `drawModel`. Les photos sont une par camp dans `assets/units/`
  (`team-A.png` / `team-B.png`). Vue de dessus, pas d'inclinaison 3D.
- Les armes vivent dans le catalogue `WEAPONS` (`state/game.js`) ; `ROLE_LOADOUTS` fixe
  l'ensemble autorisé par rôle. `m.weapon` référence une entrée du catalogue (lecture seule).
  La validation d'un choix d'arme est une règle pure (`rules/loadout.js`).
- Chaque figurine porte aussi une arme de mêlée fixe (`m.meleeWeapon`, catalogue `MELEE_WEAPONS`
  de `state/game.js`) : `a` dés contre la valeur Touche `ws`, dégâts `dn`/`dc`.
- Un **trait d'arme** est un marqueur sur l'entrée du catalogue (ex. `overheat: true` pour la
  surchauffe du plasma) ; sa règle est pure (ex. `resolveOverheat`, seuils en `config.js`) et
  son effet animé vit dans `loop/combat.js`. Les traits de tir résolus par `resolveShot` :
  `lethal` (crit dès x+), `ap` (−x dés de défense), `brutal` (seules les saves critiques bloquent),
  `devastating` (crit = x dégâts inéluctables), `precision` (x touches sûres, −x dés d'attaque),
  `saturate` (annule le couvert), en plus de `heavy` et `range`. Le nombre de dés lancés vient des
  helpers purs `attackDice`/`defenseDice`.
- Déplacement : un mouvement **contourne automatiquement le décor** (graphe de visibilité,
  `rules/pathfind.js`) ; la distance dépensée est la **longueur du chemin** contourné, plafonnée
  à `M`, pour un seul point d'action. Les figurines ne bloquent pas le trajet (seule la
  destination occupée est interdite).
- Résolution des dés : **6 = critique**, une sauvegarde annule une touche, deux sauvegardes
  (ou une sauvegarde critique) annulent une critique, le couvert offre une sauvegarde de plus,
  le masquage retire une réussite à l'attaquant. Ces règles vivent dans `src/rules/combat.js`
  (`resolveShot`) et nulle part ailleurs.
- Couvert et masquage sont deux effets **exclusifs** décidés par la géométrie dans `rules/sight.js` :
  un décor bas traversé donne le couvert s'il est proche de la cible, le masquage s'il est au milieu
  de la ligne (loin des deux). Une **figurine tierce vivante** dont le socle coupe la ligne (et à plus
  de `INTERVENING_MIN_DISTANCE` de chaque extrémité) donne aussi le couvert — au tir seulement
  (`canFight` ne passe pas les figurines à `sight`). Le couvert prime le masquage. Seuils en `config.js`.
- Score et objectifs : chaque camp accumule des points dans `state.score` (`{ A, B }`).
  L'accumulation est une règle pure sans mutation (`rules/score.js` → `awardKill` /
  `addObjectiveScore`) ; `loop/turn.js` la câble aux effets. Une **élimination** rapporte
  `KILL_POINTS` au camp responsable (crédité par `registerKill`, appelé depuis les résolutions de
  tir et de mêlée ; une auto-élimination par surchauffe ne rapporte rien). Le **contrôle de zone**
  rapporte `OBJECTIVE_POINTS` par marqueur d'objectif tenu, compté **en fin de chaque tour**
  (`scoreEndOfTurn`). Les marqueurs sont une
  liste fixe `OBJECTIVES` (config, positions en pouces), symétriques autour de l'axe vertical du
  plateau. On contrôle un marqueur si l'on a **plus de figurines vivantes** que l'adversaire dans
  un rayon `OBJECTIVE_RANGE` (règle pure `rules/objective.js` → `controlOf`/`scoreObjectives` ;
  égalité = disputé). La **victoire** finale (fin du tour `MAXTURN`) revient au plus grand total
  (`scoreWinner`, égalité = match nul) ; l'anéantissement reste une victoire immédiate.
- Corps à corps : au contact (`CONTROL_RANGE`, `rules/sight.js` → `canFight`/`inControlRange`),
  un clic ouvre un **duel** au lieu d'un tir (mêlée prioritaire, pas de tir au contact). Les deux
  figurines lancent leurs dés ; on résout en alternance **frapper/contrer** en commençant par
  l'attaquant, seule une critique contre une critique. Règle pure dans `rules/combat.js`
  (`createMelee`/`meleeOptions`/`applyMeleeAction`), orchestration interactive dans `loop/melee.js`.
  Le défenseur riposte gratuitement ; seul l'attaquant dépense 1 AP et consomme son attaque.

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
- **rules** — couche de règles pures (`geometry`, `sight`, `movement`, `pathfind`, `turn`, `combat`, `squad`, `loadout`, `mapcheck`).
- **combat** — résolution du tir (dés, seuils, annulations, dégâts) et séquence animée.
- **rendering** — dessin du plateau, des figurines, des effets et boucle de rendu.
- **turn-flow** — état partagé, activation, transitions de tour/camp, victoire.
- **testing** — commande, philosophie macro, mapping test → périmètre.
- **feature** — implémenter une fonctionnalité de bout en bout dans l'architecture.
- **prd** — rédiger une spécification sans implémenter.
