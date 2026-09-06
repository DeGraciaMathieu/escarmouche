import { KILL_POINTS, OBJECTIVE_POINTS } from '../config.js';

// Score après une élimination : le camp responsable gagne KILL_POINTS. Rend une nouvelle copie
// (ne mute pas l'argument), pour que le camp de la victime ne gagne jamais de point.
export function awardKill(score, killerTeam) {
  return { ...score, [killerTeam]: score[killerTeam] + KILL_POINTS };
}

// Score après le décompte de fin de tour : chaque objectif tenu vaut OBJECTIVE_POINTS.
// `held` est le décompte { A, B } d'objectifs contrôlés (voir rules/objective.js).
export function addObjectiveScore(score, held) {
  return {
    A: score.A + held.A * OBJECTIVE_POINTS,
    B: score.B + held.B * OBJECTIVE_POINTS,
  };
}
