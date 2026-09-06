# PRD — Décor : catalogue de pièces et skins visuels

## Objectif
Enrichir visuellement et thématiquement le plateau dans l'esprit de Kill Team **sans toucher aux
règles** : introduire un catalogue de **pièces de décor** réutilisables (géométrie + apparence),
dont les plans faits main sont assemblés, et un rendu **varié par skin** (conteneur, ruine,
barricade, caisses, cuve…).

## Base technique
- `state/game.js` : `MAPS` = catalogue de plans `{ name, desc, terrain: [{x,y,w,h,t}] }`.
  `t` ∈ `'wall'` (bloque) / `'low'` (couvert/masquage).
- `main.js` : `state.terrain = MAPS[mapKey].terrain` (affectation directe → tout champ porté par
  les rects survit dans `state.terrain`).
- `render/board.js` → `drawTerrain()` dessine chaque rect selon `t` (wall = caisse grise à rivets,
  low = caisse brune à planches), ombre portée via `lift`. **Les couleurs de décor sont déjà en
  dur ici**, cosmétiques et non liées à une règle.
- Règles (`rules/sight.js`, `rules/pathfind.js`, `rules/movement.js`) ne lisent que `x,y,w,h,t`
  des rects et ne les mutent pas → un champ cosmétique supplémentaire leur est **inerte**.

## Comportement
- Chaque plan est **composé de pièces nommées** du catalogue, chacune avec un skin distinct.
- Une pièce = un gabarit `{ variant, rects: [{dx,dy,w,h,t}] }` (coordonnées relatives) ; la
  placer en `(x, y)` produit des rects absolus `{x,y,w,h,t,variant}`.
- Le décor conserve **exactement** ses effets de règle actuels : `wall` bloque, `low` donne
  couvert/masquage. Le skin est **purement visuel** et indépendant du type `t`.
- Les plans existants (`classique`, `secteur`) sont ré-exprimés via des pièces (rendu au moins
  équivalent), et on ajoute **au moins un plan thématique** tirant parti des nouveaux skins.
- Un rect **sans `variant`** garde le rendu générique actuel (compatibilité totale).

Set de skins proposé (mapping indicatif, `variant` ⟂ `t`) :
- hauts (`wall`) : `container` (conteneur maritime), `ruin` (mur ébréché en L), `building` ;
- bas (`low`) : `barricade` (sacs/plaques), `crates` (caisses empilées), `tank` (cuve/citerne).

## Hors périmètre
- Nouveaux types de décor **jouables** (terrain difficile, mur à fenêtre, destructible).
- **Scatter** décoratif non bloquant (pourra réutiliser le même mécanisme `variant` plus tard).
- **Placement aléatoire / génération** (plans faits main uniquement).
- **Rotation** des pièces (placées telles quelles ; prévoir des gabarits orientés au besoin).
- Verticalité, objectifs de scénario.

## Impact par couche
- **config** : aucune constante nouvelle — les palettes de décor restent dans `render/board.js`
  (cosmétiques, non liées à une règle), comme l'existant.
- **rules** : **aucune modification** (les règles ignorent `variant`).
- **state** (`state/game.js`) : nouveau catalogue `PIECES` (gabarits : `variant` + rects relatifs)
  et helper de placement `place(key, x, y)` → rects absolus portant `variant`. `MAPS` réécrits
  pour assembler des pièces (`terrain: [ ...place('container', 6, 3.5), ... ]`). Aucun champ
  d'état mutable nouveau.
- **render** (`render/board.js`) : `drawTerrain` choisit le dessin selon `r.variant` (une routine
  par skin), avec **repli sur le rendu actuel** `wall`/`low` si `variant` absent.
- **input** : aucune.
- **loop** : aucune.
- **main** : aucune (l'affectation de `state.terrain` transporte déjà `variant`).

## Critères d'acceptation
- Chaque plan s'affiche avec des décors d'apparences variées (au moins conteneur/ruine pour les
  hauts, barricade/caisses pour les bas).
- Pour une géométrie donnée, portées, lignes de vue, couvert/masquage et pathfinding sont
  **identiques** à avant (le skin ne change rien aux règles).
- Un rect sans `variant` s'affiche comme aujourd'hui.
- Au moins un nouveau plan thématique est jouable depuis l'écran de choix (`main.js`).
- `npm test` reste vert **sans modification des tests de règles**.

## Tests
- Les règles étant inchangées, aucun nouveau macro-test de règle n'est requis.
- `tests/maps.test.js` (léger, cohérence du catalogue) :
  - *« place() produit des rects bien formés »* : `place(key, x, y)` renvoie des rects avec
    `x,y,w,h,t` numériques/valides et `variant` égal à celui du gabarit.
  - *« chaque plan de MAPS a un terrain non vide de rects bien formés »*.
  - *« un variant n'altère pas la ligne de vue »* : `sight` rend le même verdict sur un rect
    `wall` avec et sans `variant` (garantit l'inertie côté règles).

## Risques et questions ouvertes
- **Set de skins définitif** et leur mapping `wall`/`low` (proposé ci-dessus, à ajuster).
- **Rotation des pièces** non traitée : certaines compositions demanderont des gabarits orientés.
- **Densité / équilibre** des nouveaux plans (lisibilité, chemins, lignes de tir) — jugement de
  design à valider en jeu.
- **Palettes en render vs config** : gardées en render par cohérence avec l'existant ; à
  centraliser si les skins se multiplient.
