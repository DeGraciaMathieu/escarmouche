// Persistance des maps créées dans l'éditeur, côté navigateur (localStorage). Format d'une map
// stockée : { name, desc, terrain, objectives, deploy } — identique à une entrée de MAPS, prête
// pour startGame (objectives/deploy retombent sur les défauts de config si absents).
const KEY = 'escarmouche.maps.v1';

export function loadCustomMaps() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; }
  catch { return []; }
}

// Enregistre (ou remplace, par nom) une map personnalisée et renvoie la liste à jour.
export function saveCustomMap(map) {
  const all = loadCustomMaps().filter(m => m.name !== map.name);
  all.push(map);
  localStorage.setItem(KEY, JSON.stringify(all));
  return all;
}

export function deleteCustomMap(name) {
  const all = loadCustomMaps().filter(m => m.name !== name);
  localStorage.setItem(KEY, JSON.stringify(all));
  return all;
}
