# PRD — Mode 1 joueur contre l'IA

## Objectif

Ajouter un mode solo où le camp B (Écumeurs) est joué par une **IA à heuristique simple**. L'IA
n'est qu'un **consommateur** du jeu, au même titre qu'un joueur humain : elle émet les mêmes
intentions via une API d'actions partagée, et le **cœur du jeu (`rules/`, `state/`, `render/`)
n'a aucune connaissance de son existence**.

## Base technique

- **Seul consommateur actuel** : `src/input/controls.js` traduit les événements (clic, glisser,
  boutons, clavier) en intentions envoyées aux orchestrateurs.
- **Points d'entrée d'orchestration existants** :
  - `select(m)`, `endActivation()`, `afterAction(m)`, `autoSelect()`, `checkEnd()` (`loop/turn.js`) ;
  - `declareShot(shooter, target, s)`, `cancelShot()`, `fire()` (`loop/combat.js`) ;
  - `declareFight(atk, def, s)`, `cancelFight()`, `fight()` (`loop/melee.js`).
- **Intentions encore « en ligne » dans `controls.js`** (à extraire pour l'API partagée) :
  - **déplacement** : corps du `mouseup` (calcule `moveCheck`, pose `undoState`/`anim`, `ap--`,
    `moved`, `activated`, journal, `afterAction`) ;
  - **visée** : `btnAim.onclick` (`aimed`, `ap--`, `activated`, journal, `afterAction`).
- **Choix de duel** : `chooseAction(action)` est **interne** à `melee.js` (résout la promesse
  `waitChoice`) ; la boucle `fight()` attend un choix humain via des boutons DOM (`duActions`).
  `state.busy` reste vrai pendant tout le duel.
- **Règles pures disponibles pour décider** (lecture seule) : `sight`/`canShoot`/`canTarget`/
  `canFight`/`inControlRange` (`rules/sight.js`), `moveCheck` (`rules/movement.js`),
  `effectiveBs`/`meleeOptions` (`rules/combat.js`), `dist` (`rules/geometry.js`),
  `engagedModel`/`decideActivationEnd` (`rules/turn.js`).
- **État de session** : `state.side` (camp actif), `state.models`, `state.busy`, `state.over`,
  `state.duel`, `state.pending`, `state.terrain`, `state.rng`. Activation alternée pilotée par
  `afterAction`/`endActivation` ; `engagedModel` interdit d'activer une autre figurine tant
  qu'une activation est en cours.
- **Démarrage** : `main.js` affiche l'écran `#start`, génère les boutons depuis `MAPS`, et
  `startGame(mapKey)` initialise `state.terrain`/`models`/`rng`.

## Comportement

### Activation du mode

- L'écran de démarrage gagne un choix de **mode** : « 2 joueurs » ou « contre l'IA ». En mode
  IA, le camp **B** est l'IA ; l'humain joue **A** (Garde de Fer).
- Le mode et le camp IA sont mémorisés **hors du cœur** (dans le module `src/ai/`, activé par
  `main.js`) — aucun champ ajouté aux règles ; l'état partagé reste inchangé si possible.

### L'ordonnanceur (consommateur)

- Un **ordonnanceur** dans `src/ai/` observe `state` (comme un humain regarde l'écran) et agit
  quand c'est pertinent, sans jamais être appelé par le cœur :
  - si le mode IA est actif, la partie n'est pas finie, `!state.busy`, et `state.side` = camp IA
    → il fait jouer **une intention** de l'activation IA en cours, puis laisse les animations se
    dérouler avant la suivante ;
  - si un **duel** attend (`state.duel` et `state.duel.turn` = camp IA) → il soumet un choix
    frapper/contrer, que l'IA soit attaquante **ou** défenseuse.
- Un **délai de réflexion** sépare deux actions IA pour que le déroulé soit lisible.
- Respecte `engagedModel` : termine l'activation d'une figurine avant d'en activer une autre.

### Heuristique d'activation (par figurine, 2 PA)

Décision **pure** `decide(state, side) → intention` (déterministe ; `rng` injecté si besoin de
départager). Priorité proposée, pour la figurine IA active :

1. Une cible ennemie est **à portée de contrôle** et en vue → **engager le corps à corps**.
2. Sinon une cible est **tirable** maintenant (`canShoot`) → **viser** si un PA le permet et
   qu'elle n'a pas encore visé, puis **tirer** ; sinon tirer directement.
3. Sinon → **se déplacer** vers l'ennemi le plus proche (destination à `M` sur le chemin
   contourné via `moveCheck`), en préférant une case qui rapproche d'un tir ou d'un couvert.
4. Plus rien d'utile ou plus de PA → **terminer l'activation**.

L'IA utilise l'**arme équipée** (pas de bascule d'arme). Le choix tir vs mêlée suit la règle
existante (mêlée prioritaire au contact).

### Heuristique de duel

À son tour dans un duel, parmi `meleeOptions(state.duel)` : **frapper** en priorité (dépenser
ses réussites en dégâts) ; **contrer** une critique adverse seulement si elle menace de tuer la
figurine IA ce tour. Frappe les critiques avant les touches simples.

## Hors périmètre

- **IA élaborée** (score de menace, jeu d'objectifs, positionnement défensif fin) — v2.
- **Choix d'arme** par l'IA (utilise l'arme équipée ; pas de sélection dans la modale de tir).
- **Humain jouant le camp B**, IA des deux côtés, mode spectateur.
- **Annulation (undo)** par l'IA.
- Toute modification du mode **2 joueurs**, qui doit rester strictement inchangé.

## Impact par couche

- **config** : délai(s) de rythme de l'IA (ex. `AI_ACT_DELAY`, `AI_DUEL_DELAY`).
- **rules** : *inchangé*. La décision IA est pure mais vit dans `src/ai/` (couche consommateur),
  pas dans `rules/` ; elle **importe** les règles en lecture, jamais l'inverse.
- **state** : *aucun champ cœur ajouté* (objectif). Le mode/camp IA est porté par le module
  `src/ai/`. (À trancher : tolérer un `state.ai` de session si un partage s'avère nécessaire.)
- **render** : l'écran de démarrage `#start` gagne le choix du mode (2 boutons) ; éventuel
  libellé « l'IA joue… » dans la barre d'invite. Aucun dessin de plateau nouveau.
- **input** : extraire les intentions en **fonctions d'action partagées** (nouveau
  `src/loop/actions.js` : `moveModel(m, dest)`, `aim(m)`, `shootAt(m, target, s)`,
  `fightAt(m, target, s)`, `submitMeleeChoice(action)`), appelées par `controls.js` (humain) et
  par `src/ai/` (IA). `controls.js` cesse de contenir la logique en ligne ; `melee.js` expose
  `chooseAction` sous le nom `submitMeleeChoice`.
- **loop** : `melee.js` expose la soumission de choix ; les orchestrateurs de tir/mêlée restent
  les mêmes. L'ordonnanceur IA (`src/ai/runner.js`) est démarré par `main.js` et s'auto-déclenche
  en observant `state` (rAF ou minuterie), avec un verrou pour ne pas lancer deux décisions en
  parallèle.

## Critères d'acceptation

1. L'écran de démarrage propose « 2 joueurs » et « contre l'IA » (+ le choix du plan).
2. En mode IA, dès que la main passe au camp B, l'IA joue seule : elle déplace, vise/tire,
   engage au corps à corps et termine ses activations, sans intervention humaine.
3. L'IA ne fait **que** des coups légaux (PA, portée, ligne de vue, une attaque par tour), parce
   qu'elle passe par les mêmes actions que l'humain.
4. Dans un duel, l'IA choisit frapper/contrer à son tour (attaquante ou défenseuse) et le duel
   se résout jusqu'au bout.
5. Le cœur (`rules/`, `state/`, `render/`) ne contient **aucune référence** à l'IA (vérifiable
   par recherche).
6. Le mode 2 joueurs est strictement identique à aujourd'hui.
7. `decide(state, 'B')` est **pure** : mêmes entrées → même intention, sans DOM ni horloge.
8. La partie se termine normalement (victoire/anéantissement/4 tours) quel que soit le camp
   vainqueur.

## Tests

Macro-tests purs dans `tests/ai.test.js`, sur `decide` (et l'heuristique de duel) :

- cible ennemie à portée de contrôle → intention `fight` ;
- cible tirable, 2 PA disponibles, non encore visée → intention `aim` (puis `shoot` au coup
  suivant) ; cible tirable après visée → intention `shoot` ;
- aucune cible atteignable → intention `move` vers l'ennemi le plus proche (destination ≤ `M`) ;
- plus de cible / plus de PA → intention `endActivation` ;
- duel : renvoie une frappe quand des réussites restent ; renvoie une contre d'une critique
  létale quand la figurine IA mourrait ce tour ;
- pureté : `decide` sans DOM ni aléa non injecté, déterministe.

Pas de test DOM de l'ordonnanceur (on teste la décision, pas l'effet animé).

## Risques et questions ouvertes

- **Où mémoriser le mode/camp IA sans toucher l'état cœur** : module `src/ai/` interne
  (proposé) vs un champ de session `state.ai`. Le module interne respecte le mieux la contrainte.
- **Rythme exact** de l'IA (délai de réflexion) : proposition ~450 ms entre actions, à régler.
- **Détails d'heuristique** (ordre d'activation des figurines B, viser-avant-tirer systématique,
  recherche de couvert exacte, cible privilégiée quand plusieurs sont tirables) : proposés
  ci-dessus, à ajuster au playtest.
- **Ordonnanceur** : mécanisme d'observation (rAF vs minuterie), réentrance/verrou pour éviter
  deux décisions simultanées, et garde-fou anti-boucle (si une intention ne fait pas progresser
  l'activation, terminer l'activation).
- **Soumission de duel** : détecter le bon moment (`state.duel.turn` = IA) sans double
  soumission, alors que `state.busy` est vrai pendant tout le duel.
- **Extraction des actions** : le refactor de `controls.js` vers `loop/actions.js` doit laisser
  le comportement humain strictement identique (risque de régression sur déplacement/visée).
