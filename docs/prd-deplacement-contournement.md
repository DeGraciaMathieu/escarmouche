# PRD — Déplacement avec contournement automatique des obstacles

## Objectif

Un déplacement doit **contourner automatiquement les décors** en une seule action : le joueur
glisse la figurine vers sa destination, le jeu trace le plus court chemin qui évite les décors,
et le déplacement est légal si la **longueur du chemin** tient dans le mouvement (`M`). Fini les
petits sauts successifs qui gaspillent points d'action et de mouvement.

## Base technique

Ce qui existe déjà et qui est concerné :

- **Légalité du déplacement** : `moveCheck(m, to, models, terrain)` (`src/rules/movement.js`)
  refuse aujourd'hui tout trajet en **ligne droite** dont le segment croise un décor
  (« décor sur le trajet ») ; la distance testée est la ligne droite `dist(from, to)`.
- **Primitives géométriques** (`src/rules/geometry.js`) : `dist`, `inflate`, `pointInRect`,
  `segSegT`, `segRectT` — de quoi tester la visibilité d'un segment et inflater les décors.
- **Marge socle/décor** : `inflate(rect, m.r * TERRAIN_MARGIN_FACTOR)`, avec la logique
  « figurine coincée dans la marge » qui la laisse se dégager (`stuck`).
- **Coût d'un déplacement** (`src/input/controls.js`, `mouseup`) : `d.m.ap--`, `d.m.moved = true`,
  une action par glissement ; `d.chk.d` sert à la durée d'animation, au journal, et
  `DRAG_MIN_DISTANCE` ignore les micro-glissements.
- **Animation** : `m.anim = { from, to, t0, dur }` interpolé **linéairement** de `from` à `to`
  (`modelPos`, `src/render/board.js`). Aucune notion de chemin multi-segments.
- **Aperçu du trajet** : `drawTape` (`board.js`) trace une **ligne droite** figurine→curseur
  avec la distance et le motif ok/refusé.
- **Types de décor** : `moveCheck` bloque **tous** les décors (`wall` et `low`) ; comportement
  conservé — on contourne les deux.

## Comportement

- En glissant vers une destination, le jeu calcule le **plus court chemin** de la position de
  départ à la destination qui **évite tous les décors** (inflatés de la marge socle), via un
  **graphe de visibilité** (nœuds = départ, arrivée, coins des décors inflatés ; arêtes = paires
  mutuellement visibles ; plus court chemin type Dijkstra).
- La **distance dépensée est la longueur du chemin** (contourner coûte plus cher qu'une ligne
  droite), plafonnée à `M`. Un seul point d'action est consommé, quel que soit le nombre de
  virages.
- Si aucun chemin de longueur ≤ `M` n'existe, le déplacement est refusé (« trop loin »).
- La destination reste soumise aux mêmes règles qu'aujourd'hui : dans le plateau, pas dans
  l'emprise d'un décor (« le socle ne rentre pas »), pas sur une place occupée.
- Les **autres figurines ne bloquent pas le tracé** : on ne route qu'autour du décor ; seule la
  destination occupée est interdite.
- Une figurine **coincée dans la marge** d'un décor peut toujours s'en dégager.
- La figurine **suit visuellement le chemin** (animation le long des points de passage) et
  l'aperçu de trajet affiche le chemin contourné avec sa longueur.
- « Décor sur le trajet » **disparaît** comme motif de refus : un décor sur la ligne droite est
  désormais contourné (si le contour tient dans `M`), sinon c'est « trop loin ».

## Hors périmètre

- **Contournement des figurines** : elles ne sont pas des obstacles de trajet (décision).
- **Points de passage manuels** posés par le joueur.
- **Changement du coût en action** ou de la valeur de mouvement `M`.
- **Lissage de trajectoire** au-delà du graphe de visibilité (courbes, corridors « collés »).
- Distinction `wall`/`low` pour le mouvement : les deux restent infranchissables comme avant.

## Impact par couche

- **config** : rien de neuf attendu (la marge réutilise `TERRAIN_MARGIN_FACTOR`). Une éventuelle
  tolérance de visibilité réutilise `SEGMENT_PARALLEL_EPSILON` déjà présent.
- **rules** : nouveau module pur `rules/pathfind.js` — `findPath(from, to, rects)` renvoie la
  liste de points de passage `[from, …, to]` ou `null` si aucun chemin. `rules/movement.js` :
  `moveCheck` inflate les décors, appelle `findPath`, calcule la longueur du chemin, la compare à
  `M`, garde les contrôles de destination (bords, emprise décor, place occupée) et renvoie
  désormais aussi `path`. Une aide de visibilité (segment ne croisant aucun décor) vit dans
  `geometry.js` ou `pathfind.js`.
- **state** : `m.anim` porte un **chemin** (`path`) pour l'animation multi-segments ;
  `state.drag.chk` porte le `path` pour l'aperçu et `state.undoState` reste inchangé.
- **render** : `board.js` — `modelPos` interpole **le long du chemin** (longueur cumulée) ;
  `drawTape` trace la **polyligne** du chemin contourné avec sa longueur.
- **input** : `controls.js` — `mouseup` utilise `chk.path` (durée d'animation basée sur la
  longueur du chemin) ; toujours un seul point d'action.
- **loop** : aucune orchestration nouvelle (l'animation est lue par la boucle de rendu).

## Critères d'acceptation

- Glisser au-delà d'un décor isolé, atteignable en le contournant, réussit **en une action** et
  la figurine longe le chemin.
- La distance affichée et dépensée est la **longueur du chemin contourné**, pas la ligne droite.
- Si le contournement dépasse `M`, le déplacement est refusé (« trop loin »).
- Destination dans un décor, hors plateau, ou occupée : refus comme aujourd'hui.
- Une figurine coincée dans la marge d'un décor peut toujours s'en dégager.
- Sans obstacle entre départ et arrivée, le chemin est la ligne droite (aucune régression).

## Tests

- `tests/pathfind.test.js` (nouveau) :
  - « sans obstacle, le chemin est la ligne droite » (`findPath` → deux points, longueur = `dist`) ;
  - « un décor entre départ et arrivée impose un détour plus long que la ligne droite » ;
  - « si aucun contour ne passe, `findPath` renvoie null » (obstacle infranchissable dans les
    limites données).
- `tests/movement.test.js` (mise à jour) :
  - « un décor sur la ligne droite est contourné si le détour tient dans le mouvement »
    (anciennement refusé) ;
  - « un détour plus long que le mouvement est refusé (trop loin) » (remplace/renomme l'ancien
    « décor sur le trajet bloque ») ;
  - cas existants conservés : hors plateau, socle qui ne rentre pas, place occupée, dégagement
    de la marge.

## Risques et questions ouvertes

- **Cas limites du graphe** : départ ou arrivée dans la marge inflatée d'un décor (dégagement),
  décors dont les marges se **chevauchent** (coins « à l'intérieur » d'un autre décor à filtrer).
  *Recommandation* : ignorer les nœuds-coins situés dans un autre décor inflaté, et autoriser le
  premier/dernier segment à partir d'un point en zone de marge (préserver `stuck`).
- **Performance** : négligeable ici (une quinzaine de décors → ~60 coins), mais le graphe est en
  O(n²) sur les nœuds ; acceptable, à surveiller si la carte grandit.
- **Aucune question produit ouverte** : comportement, algorithme, rôle des figurines et livrable
  sont tranchés.
