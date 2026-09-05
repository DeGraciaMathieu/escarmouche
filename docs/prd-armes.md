# PRD — Choix d'armes par rôle

## Objectif

Introduire un **catalogue d'armes nommées** (bolter, fusil d'assaut, sniper…) et permettre au
joueur de **choisir l'arme de chaque figurine** parmi l'ensemble cohérent autorisé pour son
rôle. Les caractéristiques réutilisent le modèle d'arme existant ; la structure reste
extensible pour des règles spéciales futures.

## Base technique

Ce qui existe déjà et qui est concerné :

- **Modèle d'arme** : objet plat porté par la figurine, champ `weapon`
  (`src/state/game.js:23-36`) avec `name`, `a` (dés), `bs` (seuil de touche), `dn`/`dc`
  (dégâts normal/critique), `range?` (pouces, illimité si absent), `heavy?` (arme lourde).
- **Rôles** : chaque figurine porte déjà `role` (`meneur`, `ligne`, `appui`).
- **Données de jeu** : `TEAMS` et `TERRAIN` vivent comme structures dans `state/game.js` —
  précédent pour une table de données de jeu hors `config.js`.
- **Lecture de `weapon`** :
  - `rules/sight.js` (`canShoot`) → `weapon.range`, `weapon.heavy` ;
  - `rules/combat.js` (`resolveShot`) → alimenté par `bs`, `dn`, `dc` depuis `loop/combat.js` ;
  - `render/ui.js:37` → ligne descriptive de l'arme sur la carte ;
  - `loop/combat.js:51-53` → briefing de tir ;
  - `input/controls.js:78` → `weapon.bs` pour la mise en joue.
- **Pas de phase de setup interactive** : les figurines démarrent à des positions fixes ; une
  zone de déploiement est seulement *dessinée* (`loop/render-loop.js:12-13`), sans interaction.
- Combat inchangé : tant que `m.weapon` expose les mêmes champs, aucune règle de tir ne bouge.

## Comportement

- Il existe un **catalogue d'armes** nommées, chacune avec un jeu de caractéristiques (les
  champs actuels : dés, touche, dégâts, portée, lourde) :

  | Arme | dés | touche | dégâts | portée | lourde |
  | --- | --- | --- | --- | --- | --- |
  | Pistolet-mitrailleur | 4 | 3+ | 3/4 | 12″ | — |
  | Fusil de combat | 4 | 3+ | 3/4 | illimitée | — |
  | Canon long | 4 | 2+ | 4/5 | illimitée | oui |
  | Fusil scié | 5 | 3+ | 3/4 | 8″ | — |
  | Carabine | 4 | 4+ | 3/4 | illimitée | — |
  | Bolter | 4 | 3+ | 4/5 | 18″ | — |
  | Fusil d'assaut | 5 | 4+ | 3/4 | 16″ | — |
  | Sniper | 2 | 2+ | 5/6 | 30″ | oui |

- Chaque **rôle** définit un **ensemble d'armes autorisées** (loadout cohérent) :
  - `meneur` → pistolet-mitrailleur, fusil scié, bolter ;
  - `ligne` → fusil de combat, carabine, fusil d'assaut ;
  - `appui` → canon long, sniper.
- Le choix d'arme se fait **au moment de cibler** : cliquer une figurine adverse en **ligne de
  vue dégagée** ouvre la modale de tir (la portée n'est plus requise pour l'ouvrir). La modale
  liste les armes de l'ensemble du rôle, chacune avec ses caractéristiques et son **verdict de
  portée sur la cible** (à portée / hors de portée / arme lourde après déplacement).
- Sélectionner une arme l'**équipe durablement** (elle reste l'arme de la figurine après le
  tir) et met à jour le briefing en direct.
- Une arme **hors de portée** (ou lourde après déplacement) reste affichée mais **non
  tirable** : le bouton de tir est indisponible tant qu'une arme atteignant la cible n'est pas
  sélectionnée.
- **Les deux camps** choisissent (hotseat) : chaque joueur équipe ses propres figurines.
- Chaque figurine démarre avec une arme par défaut issue de son ensemble (les armes actuelles).

## Hors périmètre

- **Règles spéciales / traits d'arme** (sniper ignore le couvert, bolter tir multiple, bonus à
  courte portée…) : prévus « bientôt », non traités ici. Le modèle doit seulement rester
  ouvert à leur ajout.
- **Changement d'arme pendant la séquence de tir animée**.
- **Choix automatique pour un camp piloté par l'ordinateur** (le jeu est en hotseat).
- **Équilibrage** des statistiques du catalogue.
- **Déploiement interactif** des figurines (positions, zone).

## Impact par couche

- **config** : rien — le catalogue vit en donnée dans `state/game.js` (cf. décisions).
- **rules** : `rules/loadout.js` — `weaponsForRole(role, loadouts)` renvoie la liste des clés
  autorisées ; `isWeaponAllowed(role, key, loadouts)` valide un choix. `rules/sight.js` scindé :
  `canTarget(m, target, terrain)` (éligibilité indépendante de l'arme : camp, PA, tir, ligne de
  vue) et `weaponCanFire(weapon, moved, s)` (portée, arme lourde) ; `canShoot` les compose.
- **state** : `WEAPONS` (catalogue nommé) et `ROLE_LOADOUTS` (rôle → clés autorisées) exportés
  depuis `state/game.js` ; `createModels` référence une arme du catalogue par défaut ;
  `m.weapon` pointe vers une entrée du catalogue.
- **render** : `render/board.js` — les réticules marquent les cibles en ligne de vue
  (`canTarget`), la ligne de survol garde le verdict de l'arme équipée (`canShoot`).
- **input** : `input/controls.js` — le ciblage ouvre la modale sur `canTarget` (ligne de vue),
  la portée n'étant plus une condition d'ouverture.
- **loop** : `loop/combat.js` — la modale (`declareShot`) rend le sélecteur d'arme, recalcule le
  briefing à chaque changement d'arme et conditionne le tir à `weaponCanFire`.

## Critères d'acceptation

- Un catalogue d'au moins trois armes distinctes existe et chaque arme a des caractéristiques
  propres.
- Chaque rôle expose un ensemble d'armes autorisées ; on ne peut pas assigner à une figurine
  une arme absente de l'ensemble de son rôle.
- Cibler un ennemi en ligne de vue ouvre la modale même si l'arme équipée est hors de portée.
- Sélectionner une arme dans la modale met à jour immédiatement le briefing et équipe la
  figurine durablement ; le tir est impossible avec une arme hors de portée.
- Toute figurine démarre avec une arme valide de son rôle.

## Tests

- `tests/loadout.test.js` (nouveau) :
  - « un rôle ne propose que les armes de son ensemble » (`weaponsForRole`) ;
  - « une arme hors de l'ensemble du rôle est refusée » (`isWeaponAllowed` → false) ;
  - « une arme de l'ensemble du rôle est acceptée » (cas nominal).
- `tests/sight.test.js` (ajouts) :
  - « on peut cibler un ennemi en vue même si l'arme équipée est hors de portée » (`canTarget`
    vrai alors que `canShoot` faux — le cas limite qui justifie `canTarget`) ;
  - « on ne peut pas cibler un ennemi derrière un mur » (`canTarget` faux) ;
  - « une arme fait feu si la cible est dans sa portée, pas au-delà » (`weaponCanFire`).
- `tests/combat.test.js` : inchangé — non-régression de la résolution du tir.

## Décisions arrêtées

Les points suivants, ouverts au premier jet, ont été tranchés avec le concepteur :

1. **Contenu du catalogue et ensembles par rôle** : conformes au tableau et aux ensembles de la
   section *Comportement* (armes existantes + bolter, fusil d'assaut, sniper).
2. **Moment du choix** : dans la modale de tir, au moment de cibler ; ouverture sur ligne de
   vue dégagée, arme équipée durablement, arme hors de portée affichée mais non tirable.
3. **Portée du choix** : les deux camps choisissent (hotseat).
4. **Emplacement du catalogue** : `state/game.js`, comme `TEAMS`/`TERRAIN`.

## Questions ouvertes

Aucune — toutes les décisions produit sont figées ; prêt pour implémentation.
