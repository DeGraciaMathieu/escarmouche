import { createRng } from './rules/rng.js';
import { state, createModels, MAPS } from './state/game.js';
import { render } from './loop/render-loop.js';
import { refresh, journal } from './render/ui.js';
import { autoSelect } from './loop/turn.js';
import './loop/combat.js';    // enregistre les gestionnaires du panneau de combat
import './loop/melee.js';     // enregistre les gestionnaires du duel de corps à corps
import './input/controls.js'; // enregistre souris, clavier et boutons d'action

// Démarre la partie sur le plan choisi : c'est ici — et ici seulement — qu'on décide la graine
// du hasard et le décor actif.
function startGame(mapKey) {
  state.terrain = MAPS[mapKey].terrain;
  state.models = createModels();
  state.rng = createRng(Date.now());
  document.getElementById('start').classList.remove('show');
  journal(`La partie commence sur « ${MAPS[mapKey].name} » : quatre tours, activation alternée.`);
  autoSelect();
  refresh();
}

// Écran de choix du plan, affiché avant la partie ; un clic lance la partie sur ce plan.
const picks = document.getElementById('mapPicks');
for (const [key, m] of Object.entries(MAPS)) {
  const b = document.createElement('button');
  b.innerHTML = `<b>${m.name}</b><span>${m.desc}</span>`;
  b.onclick = () => startGame(key);
  picks.appendChild(b);
}
document.getElementById('start').classList.add('show');

render();
