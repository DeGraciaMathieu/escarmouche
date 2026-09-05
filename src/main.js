import { createRng } from './rules/rng.js';
import { state, createModels } from './state/game.js';
import { render } from './loop/render-loop.js';
import { refresh, journal } from './render/ui.js';
import { autoSelect } from './loop/turn.js';
import './loop/combat.js';    // enregistre les gestionnaires du panneau de combat
import './input/controls.js'; // enregistre souris, clavier et boutons d'action

// Point d'entrée : c'est ici — et ici seulement — qu'on décide la graine du hasard.
state.models = createModels();
state.rng = createRng(Date.now());

render();
journal('La partie commence : quatre tours, activation alternée.');
autoSelect();
refresh();
