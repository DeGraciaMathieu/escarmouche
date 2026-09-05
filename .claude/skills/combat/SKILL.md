---
name: combat
description: Use when touching the shooting mechanic — dice thresholds, saves, cancellations, damage, cover, aiming — or its animated resolution sequence.
auto_invoke: true
---

# Combat (tir)

Le combat se scinde en deux : la **règle pure** (`src/rules/combat.js`) et la **séquence
animée** (`src/loop/combat.js`). Toute modification de mécanique passe d'abord par la règle.

## Règle pure — `src/rules/combat.js`

| Concept | Fonction | Détail |
| --- | --- | --- |
| Critique | `isCrit(v)` | `v === CRIT_VALUE` (6) |
| Touche | `isHit(v, bs)` | `v >= bs`, `v > 1`, pas un critique |
| Sauvegarde | `isSave(v, sv)` | `v >= sv`, `v > 1`, pas un critique |
| Seuil après visée | `effectiveBs(bs, aimed)` | viser abaisse d'un cran, plancher `MIN_HIT_TARGET` (2+) |
| Résolution | `resolveShot({ atkRolls, defRolls, bs, sv, cover, dn, dc })` | renvoie comptes + `damage` |

`resolveShot` applique les annulations dans cet ordre :
1. une **sauvegarde critique** annule une critique (1 pour 1) ;
2. les sauvegardes critiques en trop deviennent des sauvegardes normales ;
3. **`SAVES_PER_CRIT` (2)** sauvegardes normales annulent une critique ;
4. une sauvegarde normale annule une touche.

Le **couvert** ajoute une sauvegarde (`cover: true`). Les dégâts valent `dc` par critique
survivante et `dn` par touche survivante. La sortie contient aussi `critCancelledByCrit`,
`critCancelledByPair`, `hitCancelled`, `survivingCrits`, `survivingHits` — utilisés par
l'animation.

## Séquence animée — `src/loop/combat.js`

| Étape | Fonction |
| --- | --- |
| Déclarer un tir (ouvre le panneau) | `declareShot(shooter, target, s)` |
| Annuler avant les dés | `cancelShot()` |
| Résoudre (dés, annulations, dégâts) | `fire()` |
| Lancer un jet de `n` dés | `throwDice(n, row, from)` |
| Clôturer et enchaîner | `endShot(shooter, dmg, target, s)` |

`fire()` **ne recalcule pas** la mécanique : il appelle `resolveShot` puis rejoue ses comptes
sur les dés à l'écran (les `ops` d'annulation sont reconstruits depuis les comptes). La valeur
finale d'un dé vient du RNG à graine : `d.v = 1 + Math.floor(state.rng() * DICE_FACES)`. Les
faces affichées pendant le spin restent sur `Math.random` (cosmétique).

Toutes les durées, décalages de dés, fréquences de son et intensités de tremblement sont des
constantes de `config.js` (section « Cadence de la séquence de tir » et suivantes).

## Modifier la mécanique de tir

1. Changer/ajouter la logique dans `resolveShot` (ou les prédicats `isHit`/`isSave`/`isCrit`)
   — **jamais** dans `fire()`.
2. Sortir toute nouvelle valeur réglable dans `config.js`.
3. Mettre à jour/ajouter les cas dans `tests/combat.test.js` (une sauvegarde annule une
   touche, deux annulent une critique, couvert, etc.).
4. Adapter l'animation de `fire()` pour consommer les nouveaux comptes de `resolveShot`.
5. Si la règle change (ex. seuil critique, nombre de sauvegardes par critique), vérifier que
   le bloc `.legend` d'`index.html` reste exact — sinon le hook doc-sync bloquera.
6. `npm test` vert avant de finir.
