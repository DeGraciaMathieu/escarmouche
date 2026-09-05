import { createRng } from './rules/rng.js';
import { state, createModels, MAPS } from './state/game.js';
import { render } from './loop/render-loop.js';
import { refresh, journal } from './render/ui.js';
import { autoSelect } from './loop/turn.js';
import { enableAi } from './ai/runner.js';
import './loop/combat.js';    // enregistre les gestionnaires du panneau de combat
import './loop/melee.js';     // enregistre les gestionnaires du duel de corps à corps
import './input/controls.js'; // enregistre souris, clavier et boutons d'action

// Démarre la partie sur le plan choisi : c'est ici — et ici seulement — qu'on décide la graine
// du hasard, le décor actif et le mode de jeu (l'IA joue le camp B en mode solo).
function startGame(mapKey) {
  state.terrain = MAPS[mapKey].terrain;
  state.models = createModels();
  state.rng = createRng(Date.now());
  if (mode === 'ia') enableAi('B');
  document.getElementById('start').classList.remove('show');
  journal(`La partie commence sur « ${MAPS[mapKey].name} »${mode === 'ia' ? ' — les Écumeurs sont joués par l’IA' : ''} : quatre tours, activation alternée.`);
  autoSelect();
  refresh();
}

// Écran de démarrage : choix du mode (2 joueurs / contre l'IA) puis du plan (un clic lance).
let mode = '2p';
const modeBox = document.getElementById('modePicks');
modeBox.querySelectorAll('button').forEach(b => {
  b.onclick = () => { mode = b.dataset.mode; modeBox.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); };
});

const picks = document.getElementById('mapPicks');
for (const [key, m] of Object.entries(MAPS)) {
  const b = document.createElement('button');
  b.innerHTML = `<b>${m.name}</b><span>${m.desc}</span>`;
  b.onclick = () => startGame(key);
  picks.appendChild(b);
}
document.getElementById('start').classList.add('show');

render();
