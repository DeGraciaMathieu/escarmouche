import { DEPLOY_ZONES } from '../config.js';

// Déploiement : replace chaque figurine dans la zone de son camp (`deploy`). La position d'origine
// d'une figurine (`createModels`) est exprimée dans la zone PAR DÉFAUT de son camp (`DEPLOY_ZONES`) ;
// on la remappe par transformation affine dans la zone active. Deux propriétés :
//  - zone active = zone par défaut → positions inchangées (aucune régression sur les maps intégrées) ;
//  - toutes les positions d'origine étant dans la zone par défaut, les figurines restent dans leur zone.
// Pur : renvoie de nouvelles figurines, ne mute pas ses arguments.
export function placeSpawns(models, deploy) {
  return models.map(m => {
    const base = DEPLOY_ZONES[m.team], zone = deploy[m.team];
    // Zone active identique à la zone par défaut → positions d'origine exactes (pas de dérive flottante).
    if (!base || !zone || sameRect(base, zone)) return { ...m };
    const nx = (m.x - base.x) / base.w, ny = (m.y - base.y) / base.h;
    return { ...m, x: zone.x + nx * zone.w, y: zone.y + ny * zone.h };
  });
}

const sameRect = (a, b) => a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
