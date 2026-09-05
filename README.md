# Escarmouche

Jeu d'escarmouche tactique au tour par tour sur un plateau continu (positions en pouces),
rendu sur canvas. Deux escouades — la Garde de Fer et les Écumeurs — s'affrontent sur quatre
tours en activation alternée : déplacement, visée et tir résolu aux dés.

## ⚠️ Le double-clic ne fonctionne plus

Le jeu est maintenant découpé en modules ESM. Les modules natifs **ne se chargent pas via
`file://`** : ouvrir `index.html` par double-clic laissera une page vide. Il faut le servir
en HTTP.

```bash
npm run dev      # sert le dossier (npx serve .) puis ouvre l'URL affichée
```

Puis ouvre l'URL indiquée (par défaut http://localhost:3000) et clique sur `index.html`.

## Tests

Les règles pures (géométrie, ligne de vue, mouvement, tour, combat) sont testées avec le
lanceur intégré de Node — aucune dépendance.

```bash
npm test         # node --test
npm run test:watch
```

Node ≥ 22 requis.

## Structure

```
index.html            markup + <script type="module" src="./src/main.js">
src/
  config.js           valeurs de jeu et constantes de réglage
  canvas.js           cv / ctx / conversion pouces→pixels
  rules/              règles pures et testées (aucun DOM, aucun aléa direct, aucun temps)
    rng.js  geometry.js  squad.js  sight.js  movement.js  turn.js  combat.js
  state/game.js       données (escouades, décor), fabrique des figurines, état mutable
  render/             tout ce qui écrit à l'écran (fx, plateau, panneau latéral)
  input/controls.js   souris, clavier, boutons
  loop/               orchestration : boucle de rendu, déroulé du tour, séquence de tir
  main.js             câblage, graine du hasard, démarrage
tests/                un fichier de tests par module de règles
docs/decisions.md     choix de refactor, aléa/temps, points laissés en l'état
```

Les règles ne dépendent que de `config.js` (et d'autres règles). Le hasard est un RNG à
graine injecté ; seul `main.js` choisit la graine.
