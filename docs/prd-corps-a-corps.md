# PRD — Combat de corps à corps (duel interactif façon Kill Team)

## Objectif

Ajouter un combat de corps à corps au contact, inspiré du système de mêlée de Kill Team :
dans la **portée de contrôle** d'un ennemi, les deux agents lancent les dés d'attaque de leur
arme de mêlée et se disputent un **duel alterné frapper / contrer**, résolu **de façon
pleinement interactive en hotseat** (chaque joueur choisit à son tour). Le corps à corps est
une seconde façon d'attaquer, distincte du tir.

## Base technique

Ce qui existe et qui est concerné, déduit du code :

- **Catalogue d'armes** `WEAPONS` et attribution `ROLE_LOADOUTS` dans `src/state/game.js`.
  Chaque figurine porte une arme de tir en lecture seule via `m.weapon` (fabrique `mk`/`createModels`).
- **Résolution du tir**, règle pure `resolveShot` (`src/rules/combat.js`) : classement des dés
  `isCrit`/`isHit`/`isSave`, seuil abaissé par la visée `effectiveBs`, seuils
  `CRIT_VALUE`/`MIN_HIT_TARGET`/`SAVES_PER_CRIT` (`config.js`). À sens unique : l'attaquant
  jette, le défenseur ne fait que se sauvegarder.
- **Ligne de vue et portée** (`src/rules/sight.js`) : `sight` (murs bloquants, couvert, masquage),
  `canTarget` (camp, PA, `shot`, LOS), `weaponCanFire` (portée, arme lourde), `canShoot`.
- **Flux de tir** : clic sur un ennemi en vue → `declareShot` (`src/loop/combat.js`) ouvre la
  modale `#combat`, `fire` joue la séquence de dés puis `playCinematic` les effets plateau,
  `endSequence` dépense 1 AP, pose `m.shot`, appelle `afterAction`.
- **Économie d'activation** : `m.ap`/`m.apl` (2 AP), drapeaux `aimed`/`moved`/`shot`/`activated`,
  `afterAction` (`src/loop/turn.js`) termine l'activation à 0 AP, `engagedModel` empêche
  d'activer une autre figurine tant qu'une activation est en cours.
- **Déplacement** : glisser une figurine (`src/input/controls.js`), trajet qui contourne le
  décor, coûte 1 AP. Amène naturellement au contact.
- **Rendu** : modale de combat dans `index.html` (`#combat`, `#cbBrief`, `#cbWeapons`,
  `#field`, dés), effets plateau `src/render/fx.js` (`muzzle`, `tracer`, `shield`, `impact`,
  `float`), légende `.legend` d'`index.html`.
- **État partagé** `state` (`src/state/game.js`) : `state.pending` porte le tir déclaré ;
  `state.busy` verrouille l'entrée pendant une résolution.
- **Tests** : macro-tests purs de la résolution dans `tests/combat.test.js`.

## Comportement

### Armes de mêlée

- Chaque figurine porte **une arme de mêlée fixe** en plus de son arme de tir, référencée par
  `m.meleeWeapon` (lecture seule), issue d'un nouveau catalogue `MELEE_WEAPONS`.
- Une arme de mêlée a pour caractéristiques : `a` (nombre de dés d'attaque), `ws` (valeur
  Touche **T**, seuil de réussite), `dn` (dégâts **D** par touche normale), `dc` (dégâts par
  critique).
- Pas de portée (`range`), pas d'arme lourde, pas de visée en mêlée.

**Catalogue proposé** (à valider — voir questions ouvertes) :

| clé | nom | a | ws (T) | dn (D) | dc | note |
| --- | --- | --- | --- | --- | --- | --- |
| `crosse` | Crosse | 3 | 4 | 2 | 3 | mêlée par défaut d'un tireur |
| `couteau` | Couteau de combat | 4 | 3 | 3 | 4 | fiable |
| `machette` | Machette | 4 | 3 | 3 | 5 | |
| `hache` | Hache d'abordage | 4 | 3 | 4 | 6 | critique dévastateur |

**Attribution proposée** — la Garde de Fer tire, les Écumeurs frappent :

- Sergent Kael (A, meneur) → `couteau` ; Fusilier Dorn (A, ligne) → `crosse` ;
  Tireur Vess (A, appui) → `crosse`.
- Chef Sarn (B, meneur) → `hache` ; Pillards Kro / Yun / Tass (B, ligne) → `machette`.

### Déclenchement

- Deux figurines sont **au contact** si l'adverse est dans la **portée de contrôle**
  `CONTROL_RANGE` pouces (centre à centre) **et** en ligne de vue (les murs bloquent, comme au tir).
- Le joueur amène sa figurine au contact par un **déplacement normal** (coût existant), puis un
  **clic sur l'ennemi au contact** ouvre la modale de duel (action *Combattre*).
- **Précédence au contact (mêlée prioritaire)** : si la cible cliquée est dans la portée de
  contrôle et en vue, le clic ouvre le **duel** ; au-delà, il ouvre la **modale de tir** comme
  aujourd'hui. Une figurine au contact **ne peut donc pas tirer** sur cette cible — il faudrait
  d'abord s'en éloigner (aucune règle de désengagement dédiée dans cette version).
- Prérequis (règle `canFight`, miroir de `canShoot`) : cible adverse et vivante, attaquant
  vivant avec ≥ 1 AP, attaquant n'ayant pas déjà attaqué ce tour (`!m.shot`), cible dans la
  portée de contrôle, ligne de vue dégagée. L'attaquant doit posséder une arme de mêlée.

### Duel (résolution alternée)

1. **Jets simultanés** : l'attaquant lance `meleeWeapon.a` dés contre sa valeur Touche (T),
   le défenseur lance `meleeWeapon.a` dés contre la sienne. `6` = critique, `1` =
   échec toujours ; toute autre valeur ≥ T = touche normale. Chaque camp obtient un lot de
   réussites normales et de critiques (les échecs sont écartés).
2. **Le défenseur riposte gratuitement** : il lance et résout ses dés **sans coût d'AP**, même
   déjà activé ce tour. La main passe à son joueur pour ses choix, puis revient.
3. **Résolution alternée**, en commençant par **l'attaquant** : à son tour, le joueur actif
   choisit **un** de ses dés de réussite non résolus et décide :
   - **Frapper** : inflige les dégâts du dé (`dn` si normal, `dc` si critique) à l'adverse ;
     le dé est consommé.
   - **Contrer** : le dé est consommé pour **défausser un dé de réussite adverse non résolu**.
     Une réussite **normale** ne peut contrer qu'une réussite **normale** adverse. Une réussite
     **critique** peut contrer n'importe quel dé adverse. **Seule une critique peut bloquer une
     critique.**
4. Les joueurs alternent, un dé à la fois. Quand un camp n'a plus de dé, l'autre résout tous
   les siens d'affilée. Le duel dure jusqu'à ce que toutes les réussites soient résolues.
5. **Fin anticipée** : un agent atteignant 0 PV pendant le duel **meurt** ; le duel s'arrête et
   les dés restants sont écartés.

### Après le duel

- Les PV des deux figurines sont mis à jour ; une figurine à 0 PV est mise hors de combat
  (comme au tir).
- **Seul l'attaquant dépense 1 AP** et voit son attaque consommée (`m.shot = true`,
  `activated = true`) ; le défenseur ne dépense rien et garde ses drapeaux.
- Enchaînement standard : `checkEnd` (anéantissement) puis `afterAction(attaquant)`.

## Hors périmètre

- **Assistance (soutien de combat)** : le bonus de valeur Touche (T) apporté par un allié dans
  la portée de contrôle de l'ennemi est **retiré de cette version**. À rajouter plus tard.
- **Traits d'arme de mêlée** de Kill Team (Brutal, Lethal, Rending, Ceaseless…) — un seul
  trait de mêlée pourra être ajouté plus tard sur le modèle du trait `overheat`.
- **Tir en état d'engagement** (pistolets), désengagement, mouvement de charge dédié
  (le déplacement normal amène au contact).
- **Choix de l'arme de mêlée** en jeu (chaque figurine a une arme de mêlée fixe ; pas de
  sélecteur équivalent à `cbWeapons`).
- **Annulation (undo)** d'un duel : comme le tir, il est engageant.

## Impact par couche

- **config** : `CONTROL_RANGE` (portée de contrôle, pouces). Réutiliser au maximum les cadences
  et effets du tir (`DIE_*`, `CANCEL_*`, `DAMAGE_*`) ; ajouter une constante de durée seulement
  si le duel introduit une étape sans équivalent.
- **rules** (`rules/combat.js`, pur, sans DOM ni hasard) :
  - classement des dés de mêlée en réutilisant `isCrit`/`isHit(v, ws)` ;
  - fabrique d'état de duel `createMelee({ atkRolls, defRolls, atkWeapon, defWeapon, atkHp, defHp })` ;
  - `meleeOptions(duel)` → actions légales du joueur actif (dés pouvant frapper ; pour contrer :
    une normale ne cible que les réussites normales adverses, une critique cible n'importe quoi) ;
  - `applyMeleeAction(duel, action)` → nouvel état (dégâts appliqués, dé(s) consommé(s),
    changement de main, drapeau de fin sur mort). Déterministe et testable ; le jet des dés
    reste dans la boucle.
  - `rules/sight.js` : `canFight(m, target, terrain)` (miroir de `canShoot`, portée de contrôle
    au lieu de la portée d'arme, sans arme lourde ni visée) et un prédicat de portée de contrôle.
- **state** (`state/game.js`) : catalogue `MELEE_WEAPONS` ; champ `meleeWeapon` sur chaque
  figurine dans `createModels`/`mk` ; `state.duel` (état de duel interactif en cours, à côté
  de `state.pending`).
- **render** : modale de duel (réutiliser la structure de `#combat` ou une modale sœur)
  affichant les deux lots de dés, le camp dont c'est le tour, et les boutons
  **Frapper / Contrer** (+ sélection du dé adverse à contrer) ; effet plateau de choc au
  contact (réutiliser `impact`/`float`/`shield`, secousse) ; mise à jour de la légende `.legend`.
- **input** (`input/controls.js`) : au clic sur un ennemi, router vers le duel si dans la
  portée de contrôle, sinon vers le tir ; entrées clavier pour Frapper/Contrer pendant le
  duel ; respecter `engagedModel` et `state.busy`.
- **loop** (nouveau `loop/melee.js` ou extension de `loop/combat.js`) : `declareFight`, calcul
  de l'assistance des deux camps, jet des deux lots de dés (via `state.rng`), **boucle de
  résolution interactive** qui lit les choix du joueur actif, appelle `applyMeleeAction` à
  chaque étape, rend l'état, passe la main au bon joueur, puis à la fin applique les PV, joue
  la cinématique et appelle `afterAction`. (Pas de calcul d'assistance dans cette version.)

## Critères d'acceptation

1. Chaque figurine possède une `meleeWeapon` visible dans son profil.
2. Cliquer un ennemi **hors** portée de contrôle ouvre la modale de tir (comportement inchangé).
3. Cliquer un ennemi **dans** la portée de contrôle et en vue ouvre la modale de duel.
4. Impossible d'engager sans AP, après avoir déjà attaqué (`shot`), hors vue, ou hors portée
   de contrôle (message d'échec cohérent).
5. Les deux figurines lancent `a` dés ; `6` critique, `1` échec, ≥ T touche.
6. L'attaquant résout le premier dé ; la main alterne ensuite entre les deux joueurs ; quand un
   camp n'a plus de dé, l'autre résout les siens.
7. **Frapper** retire `dn` (ou `dc`) PV à l'adverse ; **Contrer** défausse une réussite adverse
   du bon type (une normale ne défausse qu'une normale ; une critique défausse n'importe quoi ;
   une normale seule **ne bloque pas** une critique).
8. Une figurine tombée à 0 PV meurt et le duel s'arrête, dés restants écartés.
9. À l'issue, seul l'attaquant perd 1 AP et voit son attaque consommée ; le défenseur ne perd
   ni AP ni activation.
10. La victoire par anéantissement et l'enchaînement d'activation fonctionnent après un duel.

## Tests

Macro-tests purs à ajouter (avant/après), dans un nouveau `tests/melee.test.js` (ou en section
de `tests/combat.test.js`), sur les fonctions pures de `rules/combat.js` :

- classement des dés de mêlée : `6` critique et `1` échec quel que soit T ; ≥ T = touche.
- **frapper** : une touche normale retire `dn` PV, une critique `dc` PV.
- **contrer** : une normale défausse une réussite normale adverse ; une critique défausse une
  critique adverse ; une critique peut aussi défausser une normale ; une normale seule **ne
  peut pas** défausser une critique.
- **alternance** : `applyMeleeAction` donne la main à l'attaquant d'abord, puis alterne ; quand
  un camp est vide, l'autre résout tout.
- **fin par mort** : une frappe amenant l'adverse à ≤ 0 PV termine le duel et écarte les dés
  restants.
- **`canFight`** (peut vivre dans `tests/sight.test.js`) : refus hors portée de contrôle, hors
  vue, sans AP, après `shot` ; acceptation au contact en vue.

## Risques et questions ouvertes

Décisions que le code ne tranche pas et laissées ouvertes (jamais résolues par supposition) :

- **Valeurs de `MELEE_WEAPONS`** (a/ws/dn/dc) et **attribution par figurine** : proposées
  ci-dessus, à valider ou remplacer.
- **`CONTROL_RANGE`** : valeur exacte en pouces (proposition : `2″` centre à centre ; Kill Team
  utilise 1″ socle à socle, soit ≈ 1,2″ centre à centre avec `BASE_RADIUS = 0.62`).
- **Comportement si le défenseur n'obtient aucune touche** : il « regarde » l'attaquant
  résoudre (aucun choix) — supposé acceptable.
- **Traits de mêlée** : explicitement hors périmètre pour cette version.
