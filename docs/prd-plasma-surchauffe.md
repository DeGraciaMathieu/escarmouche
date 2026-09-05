# PRD — Pistolet plasma et règle de surchauffe

## Objectif

Ajouter le **pistolet plasma** au catalogue d'armes, doté du premier **trait d'arme** du jeu :
la **surchauffe**. Après chaque tir de plasma, le tireur lance un dé de surchauffe et peut se
blesser lui-même — un risque à assumer pour une arme puissante.

## Base technique

Ce qui existe déjà et qui est concerné :

- **Catalogue d'armes** `WEAPONS` et ensembles `ROLE_LOADOUTS` (`src/state/game.js`) : chaque
  arme est un objet plat de caractéristiques (`a`, `bs`, `dn`, `dc`, `range?`, `heavy?`). Aucun
  trait spécial pour l'instant.
- **Résolution pure du tir** `resolveShot({...})` (`src/rules/combat.js`) : ne concerne que la
  cible ; ne touche pas le tireur. `isCrit`/`isHit`/`isSave`, seuils dans `config.js`
  (`CRIT_VALUE`, `DICE_FACES`…).
- **Séquence animée** `fire()` puis `endShot(shooter, dmg, target, s)` (`src/loop/combat.js`) :
  `fire()` lance les dés (attaque, défense), applique les dégâts à la **cible** (`target.hp`),
  puis appelle `endShot`. La branche « rafale perdue » (aucune touche) appelle aussi `endShot`.
  `endShot` décrémente les PA, marque `shot`, ferme la modale, fait `checkEnd()` puis
  `afterAction`. **`endShot` est l'entonnoir commun** aux deux branches (touche / manque).
- **Hasard injecté** : la valeur finale des dés vient de `state.rng()` (graine décidée par
  `main.js`) — même canal pour le dé de surchauffe.
- **Effets sur une figurine** : dégâts flottants, tremblement d'écran, mise « hors de combat »
  et `checkEnd()` existent déjà (utilisés pour la cible dans `fire()`).

## Comportement

- Le **pistolet plasma** rejoint le catalogue et l'ensemble du rôle **meneur** :
  `a` 3, `bs` 3+, `dn`/`dc` 4/6, portée 10″, non lourde, trait **surchauffe**.
- Après la résolution d'un tir de plasma (que la cible soit touchée **ou non**), le tireur lance
  **un dé de surchauffe** :
  - résultat **1** → le tireur **subit 2 dégâts** ;
  - tout autre résultat → aucun effet.
- La surchauffe peut mettre le **tireur hors de combat** ; la condition de victoire est
  réévaluée en conséquence.
- Le dé de surchauffe est présenté dans la modale de tir avant sa fermeture, avec un retour
  visuel de la blessure éventuelle sur le tireur (comme pour les dégâts sur la cible).
- Les armes **sans** trait surchauffe sont inchangées.

## Hors périmètre

- Autres traits d'arme (perce-couvert, tir multiple, etc.).
- Surchauffe « par dé d'attaque » façon Kill Team strict (ici : un seul dé après le tir).
- Choix du seuil/dégâts par le joueur en jeu (valeurs de règle en `config.js`).
- Équilibrage des stats du plasma.

## Impact par couche

- **config** : `OVERHEAT_ROLL` (= 1, résultat déclencheur) et `OVERHEAT_DAMAGE` (= 2, dégâts au
  tireur) ; éventuelles constantes d'animation du dé de surchauffe si besoin.
- **rules** : `rules/combat.js` — nouvelle fonction pure `resolveOverheat(roll)` renvoyant les
  dégâts subis par le tireur (`OVERHEAT_DAMAGE` si `roll === OVERHEAT_ROLL`, sinon 0). Le trait
  se lit sur l'arme (`weapon.overheat`).
- **state** : `state/game.js` — entrée `WEAPONS.plasma` (avec `overheat: true`) ; ajout de
  `'plasma'` à `ROLE_LOADOUTS.meneur`.
- **render** : réutilisation des effets existants (dégâts flottants, tremblement) pour la
  blessure du tireur.
- **input** : aucun changement (le choix du plasma passe déjà par la modale de tir).
- **loop** : `loop/combat.js` — dans `endShot` (entonnoir commun), si `shooter.weapon.overheat`,
  lancer un dé de surchauffe (`state.rng()`), appliquer `resolveOverheat`, réduire `shooter.hp`,
  gérer la mise hors de combat et le journal, **avant** `checkEnd()`.

## Randomness

| Point d'appel | Classification | Traitement |
| --- | --- | --- |
| valeur du dé de surchauffe | rule-bearing | `state.rng()` (graine injectée), comme les dés de tir |
| animation du dé de surchauffe | cosmetic | timing/visuel dans `loop`/`render` |

## Critères d'acceptation

- Un meneur peut équiper le pistolet plasma via la modale de tir ; ses stats s'appliquent
  normalement à la résolution.
- Après chaque tir de plasma (touche ou manque), un dé de surchauffe est lancé.
- Sur un résultat de `OVERHEAT_ROLL`, le tireur perd `OVERHEAT_DAMAGE` PV ; sinon rien.
- Si la surchauffe réduit le tireur à 0 PV, il est mis hors de combat et la victoire est
  réévaluée.
- Les autres armes ne déclenchent jamais de surchauffe.

## Tests

- `tests/combat.test.js` (ajouts) :
  - « un dé de surchauffe à 1 blesse le tireur » (`resolveOverheat(1)` = `OVERHEAT_DAMAGE`) ;
  - « tout autre résultat de surchauffe est sans effet » (`resolveOverheat(2..6)` = 0).

## Décisions arrêtées

1. **Arme** : pistolet plasma `a3 bs3+ 4/6 R10″`, trait surchauffe, ajouté au rôle **meneur**.
2. **Surchauffe** : après le tir, 1 dé ; sur un **1**, le tireur subit **2 dégâts**.
3. **Déclenchement** : **toujours** après le tir (touche ou manque).
4. **Modèle de données** : trait marqué sur l'arme (`overheat: true`) ; seuil et dégâts en
   `config.js` (comme `CRIT_VALUE`/`MIN_HIT_TARGET`).

## Questions ouvertes

Aucune — prêt pour implémentation.
