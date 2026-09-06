# PRD — Ligne de tir : les figurines donnent du couvert

## Objectif
Une figurine traversée par la ligne de tir protège la cible : celle-ci passe **à couvert**
(+1 dé de sauvegarde), le tir restant possible. Les figurines cessent d'être transparentes au
tir, sans pour autant le bloquer.

## Base technique
- `rules/sight.js` → `sight(a, b, terrain)` ne considère aujourd'hui **que le décor** : un mur
  bloque (`los:false`), un décor bas traversé donne `cover` (près de la cible) ou `masked` (au
  milieu), exclusifs, le couvert primant (`if (cover) masked = false`). Renvoie `{ los, cover, masked, len }`.
- `canTarget` / `canShoot` / `canFight` (même fichier) s'appuient tous sur `sight`.
- `rules/geometry.js` fournit `dist`, `distPointRect`, `segRectT`, `segSegT`, `pointInRect` —
  mais **pas** de distance point→segment.
- Une figurine a déjà `x`, `y`, `r` (rayon de socle = `BASE_RADIUS` = 0,62″), `alive`, `team`.
- Consommateurs de `s.cover` (déjà en place, donc automatiques) :
  - `render/board.js` : couleur de l'anneau de cible, de la ligne de tir et du libellé
    (« à couvert », doré) ;
  - `loop/combat.js` : la résolution accorde **+1 dé de sauvegarde** quand `s.cover`, et la
    modale affiche « + 1 dé de couvert offert ».
- Appelants qui devront transmettre la liste des figurines : `input/controls.js` (curseur,
  ciblage), `render/board.js` (anneaux, ligne de tir), `ai/decide.js` (`canShoot`).

## Comportement
- Lors d'un tir, si le segment tireur→cible **coupe le socle d'une figurine tierce vivante**
  (n'importe quel camp), la cible est **à couvert** : +1 dé de sauvegarde, le tir se résout
  normalement.
- Le tireur et la cible ne se comptent jamais eux-mêmes. Les figurines mortes ne comptent pas.
- Une figurine **trop proche d'une extrémité** (à moins de `INTERVENING_MIN_DISTANCE` = 1″ du
  tireur **ou** de la cible) ne donne pas de couvert : une amie collée au tireur ou une figurine
  au corps à corps avec la cible ne compte pas comme écran.
- Plusieurs figurines interposées ne cumulent pas : le couvert reste **booléen** (un dé max).
- Un **mur** bloque toujours entièrement (inchangé) et prime sur tout.
- Le couvert de figurine suit la même exclusivité que le couvert de décor : s'il s'applique, il
  annule un éventuel masquage (`cover` prime `masked`).
- Le **corps à corps est inchangé** : une figurine interposée n'affecte pas l'engagement
  (`canFight`), l'engagement se jugeant au contact (≤ `CONTROL_RANGE`).

## Hors périmètre
- Blocage total, masquage, ou effet dépendant de la position pour les figurines (seul le
  **couvert** est retenu).
- Effet des figurines sur le corps à corps.
- Cumul de couvert (figurine + décor, ou plusieurs figurines).
- Prise en compte des figurines dans le **trajet de déplacement** (inchangé : elles ne bloquent
  pas le chemin, seule la destination occupée est interdite).
- Distinction visuelle entre « couvert par une figurine » et « couvert par le décor ».

## Impact par couche
- **config** : une constante nouvelle — `INTERVENING_MIN_DISTANCE = 1` (distance mini, en pouces,
  entre une figurine interposée et **chacune** des extrémités tireur/cible pour qu'elle donne le
  couvert). Le seuil d'interposition latérale reste le rayon de socle `m.r` (déjà `BASE_RADIUS`),
  sans constante dédiée.
- **rules** :
  - `geometry.js` : nouvelle fonction pure `distPointSeg(p, a, b)` (distance d'un point au segment).
  - `sight.js` : `sight(a, b, terrain, models = [])` — après la boucle décor (si aucun mur n'a
    bloqué), toute figurine `alive`, différente de `a` et `b`, dont le socle coupe le segment
    (`distPointSeg(m, p1, p2) < m.r`) **et** située à plus de `INTERVENING_MIN_DISTANCE` de `a`
    comme de `b`, pose `cover = true` ; puis `if (cover) masked = false` (inchangé).
    `canTarget(m, target, terrain, models = [])` et `canShoot(…, models)` propagent `models`.
    **`canFight` n'passe pas `models`** (tir seulement).
- **state** : aucun champ nouveau.
- **render** : aucun dessin nouveau — l'affichage « à couvert » et la modale consomment déjà
  `s.cover`. `board.js` transmet `state.models` à `sight`/`canTarget`.
- **input** : `controls.js` transmet `state.models` à `canTarget`.
- **loop** : `combat.js` inchangé (accorde déjà le dé de couvert selon `s.cover` porté par
  `pending.s`).
- **ai** : `decide.js` transmet `state.models` à `canShoot`.

## Critères d'acceptation
- Un tir dont la ligne traverse le socle d'une figurine tierce → `s.cover === true`, `s.los === true`.
- La cible reçoit **+1 dé de sauvegarde** à la résolution, et la modale/ligne indiquent « à couvert ».
- Tireur et cible ne se comptent pas comme interposés (aucun couvert par eux-mêmes).
- Une figurine morte sur la ligne ne donne pas de couvert.
- Une figurine hors de la ligne (au-delà de son rayon) ne donne pas de couvert.
- Une figurine à moins d'1″ du tireur ou de la cible ne donne pas de couvert.
- Plusieurs figurines interposées → toujours un seul dé de couvert.
- Un mur sur la ligne bloque toujours (`los:false`), même avec une figurine interposée.
- Le couvert de figurine annule le masquage éventuel du décor.
- `canFight` (corps à corps) rend le même verdict avec ou sans figurine interposée.

## Tests
Dans `tests/sight.test.js` (les tests existants restent valides : `models` par défaut `[]`) :
- *« une figurine sur la ligne de tir met la cible à couvert »* : `sight(a, b, [], [inter])` avec
  `inter` centrée sur le segment → `cover:true`, `los:true`, `masked:false`.
- *« le tireur et la cible ne se comptent pas comme interposés »* : `sight(a, b, [], [a, b])` →
  `cover:false`.
- *« une figurine morte n'interpose pas »* : `inter.alive === false` → `cover:false`.
- *« une figurine hors de la ligne n'interpose pas »* : `inter` décalée de > `r` → `cover:false`.
- *« une figurine à moins d'1″ d'une extrémité n'interpose pas »* : `inter` sur la ligne mais à
  ≤ `INTERVENING_MIN_DISTANCE` du tireur → `cover:false`.
- *« un mur prime sur le couvert d'une figurine »* : mur + figurine interposée → `los:false`.
- *« le couvert de figurine annule le masquage »* : décor bas masquant au milieu + figurine
  interposée → `cover:true`, `masked:false`.
- *« le corps à corps ignore une figurine interposée »* : `canFight` inchangé (ok au contact,
  bloqué seulement par un mur) que `models` contienne ou non une interposée.

## Décisions tranchées
- **Seuil d'interposition** : socle exact (`< m.r`), sans marge — géométrie physique de la figurine.
- **Figurine collée à une extrémité** : ignorée si à ≤ 1″ (`INTERVENING_MIN_DISTANCE`) du tireur
  ou de la cible.

## Risques et questions ouvertes
- **IA** : `bestTarget` verra certaines cibles « à couvert » (via `s.cover`) — effet automatique
  sur le choix de cible, sans changement voulu de l'heuristique. À surveiller.
- **Pas de cumul** : le couvert restant booléen, couvert-décor et couvert-figurine ne
  s'additionnent pas (voulu).
