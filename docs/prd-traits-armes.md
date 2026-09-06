# PRD — Traits d'arme (pack facile) : Létale, Perforante, Brutale, Dévastatrice, Précision, Saturation

## Objectif
Enrichir la variété tactique du tir en ajoutant six **traits d'arme** inspirés de Kill Team, tous
résolus dans la règle pure de tir. Un trait est un marqueur nommé sur l'entrée du catalogue
`WEAPONS` ; sa règle vit dans `resolveShot` (et le nombre de dés lancés côté `loop`).

## Base technique
- `rules/combat.js` → `resolveShot({ atkRolls, defRolls, bs, sv, cover, masked, dn, dc })` : cœur
  de résolution. Crit = 6 (`CRIT_VALUE`), touche `≥ bs`, save `≥ sv`, couvert = +1 save,
  masquage = −1 réussite attaquant. Annulations : crit-save annule crit, 2 saves normales annulent
  un crit, 1 save annule une touche. `isCrit(v)`, `isHit(v, bs)`, `isSave(v, sv)`.
- `loop/combat.js` → `fire()` lance les dés (`shooter.weapon.a` dés d'attaque, `DEFENSE_DICE`=3
  dés de défense), appelle `resolveShot`, et anime. La modale (`shotBrief`) affiche l'arme.
- `state/game.js` → catalogue `WEAPONS` (objets plats). Traits déjà présents : `heavy`, `range`,
  `overheat`, `tracer`. `ROLE_LOADOUTS` fixe les armes par rôle.
- Précédent de trait : `overheat` (marqueur → `resolveOverheat` pur → effet animé).

## Comportement
Chaque trait est une propriété de l'entrée `WEAPONS` ; sa valeur `x` (quand il y en a une) vit sur
l'arme, pas en constante globale.

- **Létale x+** (`lethal: x`) — l'attaquant obtient un **critique dès x+** au lieu de 6. N'affecte
  que les dés de l'attaquant (le défenseur crit toujours sur 6).
- **Perforante x** (`ap: x`) — le défenseur lance **`3 − x` dés** de défense (plancher 0).
- **Brutale** (`brutal: true`) — les **saves normales ne comptent plus** (y compris le dé de
  couvert) ; seules les **saves critiques** peuvent bloquer.
- **Dévastatrice x** (`devastating: x`) — chaque **critique de l'attaquant** inflige **x dégâts
  inéluctables** (non annulables), et ce critique est **retiré** de la résolution normale (il ne
  compte plus ni pour `dc` ni pour les annulations).
- **Précision x** (`precision: x`) — l'attaquant lance **`a − x` dés** et gagne **x réussites
  normales automatiques**.
- **Saturation** (`saturate: true`) — **annule le bénéfice du couvert** pour cette attaque
  (réinterprétation : la « save retenue » de Kill Team n'existe pas ici, le couvert = +1 dé).

### Ordre de résolution (dans `resolveShot`)
1. `crits` = dés ≥ `critOn` (=`lethal` ou 6) ; `hits` = dés dans `[bs, critOn[`.
2. **Précision** : `hits += precision` (dés lancés = `a − precision`, fait côté `loop`).
3. **Masquage** : retire une réussite (touche d'abord, critique à défaut).
4. **Dévastatrice** : `mortal = crits × x` ; puis `crits = 0` (retirés du pool annulable).
5. Défense : dés lancés = `3 − ap` (côté `loop`) ; **couvert** appliqué sauf si `saturate` ;
   **Brutale** → saves normales ignorées.
6. Annulations existantes (crit/crit, paires, touches).
7. `dégâts = mortal + survivingCrits × dc + survivingHits × dn`.

### Attribution proposée (à ajuster — cf. questions ouvertes)
- `sniper` → **Létale 5+** + **Perforante 1** ; `bolter` → **Perforante 1** ;
- `plasma` → **Dévastatrice 3** ; `scie` (fusil scié) → **Saturation** ;
- `canon` → **Brutale** ; `carabine` → **Précision 1**.

## Hors périmètre
- Traits du pack « manipulation de dés » (Vengeresse, Fatale, Équilibrée), **Choc** (mêlée),
  **Étourdissante**, **Limitée**, **Silencieuse** — traités séparément.
- Application des traits au **corps à corps** (ce pack ne concerne que le tir / `resolveShot`).
- Effets animés dédiés par trait (réutilisation de l'animation de tir existante ; un libellé
  dans la modale suffit).

## Impact par couche
- **config** : aucune constante globale (valeurs `x` portées par les armes ; planchers = 0
  structurels).
- **rules** (`rules/combat.js`) : `isCrit`/`isHit` acceptent un seuil de crit paramétrable ;
  `resolveShot` gagne les paramètres `critOn, ap, brutal, devastating, precision, saturate` et
  applique l'ordre ci-dessus. Fonctions pures, inchangées pour une arme sans trait (valeurs par
  défaut = comportement actuel).
- **state** (`state/game.js`) : nouveaux marqueurs sur les entrées `WEAPONS` concernées.
- **render** : la modale (`loop/combat.js` → `shotBrief`) mentionne les traits actifs de l'arme
  (déjà l'endroit qui affiche l'arme). Le sélecteur d'armes peut afficher le trait.
- **loop** (`loop/combat.js` → `fire`) : nombre de dés lancés = `a − precision` (attaque) et
  `3 − ap` (défense) ; passe les paramètres de trait à `resolveShot`.
- **input** : aucune.

## Critères d'acceptation
- Une arme **sans trait** donne exactement le même résultat qu'aujourd'hui (non-régression).
- **Létale x+** : un dé d'attaque de valeur `x..5` compte comme critique.
- **Perforante x** : le défenseur lance `x` dés de moins (plancher 0).
- **Brutale** : une save normale (ou de couvert) n'annule aucune réussite ; seules les crit-saves
  bloquent.
- **Dévastatrice x** : chaque critique inflige `x` dégâts non annulables, même si le défenseur
  réussit toutes ses saves.
- **Précision x** : `x` réussites normales garanties, `a − x` dés lancés.
- **Saturation** : le couvert n'ajoute pas de save.
- Les traits se **combinent** (ex. sniper Létale + Perforante) et l'ordre de résolution est
  respecté.

## Tests
`tests/combat.test.js` (macro-tests de `resolveShot`, dés fournis en dur) :
- non-régression sans trait ;
- Létale : un `5` devient critique avec `critOn:5` ;
- Perforante : moins de dés de défense → plus de dégâts, à dés égaux ;
- Brutale : saves normales sans effet, crit-save bloque ;
- Dévastatrice : dégâts inéluctables malgré défense parfaite ;
- Précision : hits garantis ajoutés ;
- Saturation : couvert neutralisé.

## Risques et questions ouvertes
- **Attribution des traits aux armes** (proposée ci-dessus) — équilibrage à valider en jeu.
- **Valeurs `x`** (Létale 5+, Perforante 1, Dévastatrice 3, Précision 1) — premières valeurs, à
  affiner.
- **Interaction Brutale + Saturation + couvert** : Brutale neutralise déjà la save de couvert ;
  Saturation neutralise le couvert en amont — cumul sans effet de bord (à couvrir en test).
- **Affichage** : jusqu'où détailler les traits dans la modale / le sélecteur d'armes (libellé
  court vs description complète) — à trancher au moment du rendu.
