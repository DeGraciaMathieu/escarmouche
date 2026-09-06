import { PPI } from './config.js';

export const cv = document.getElementById('cv');
export const ctx = cv.getContext('2d');

// Conversion pouces → pixels du plateau.
export const px = v => v * PPI;

// Aligne le backing du canvas sur sa taille affichée × la densité de l'écran (retina) pour un
// rendu net. Le repère de dessin reste logique (900×660 via px()) ; la boucle de rendu applique
// l'échelle backing/logique. À appeler au démarrage et au redimensionnement de la fenêtre.
export function resize() {
  const dpr = window.devicePixelRatio || 1;
  const r = cv.getBoundingClientRect();
  if (r.width) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
}
