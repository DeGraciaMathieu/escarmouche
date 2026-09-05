import { PPI } from './config.js';

export const cv = document.getElementById('cv');
export const ctx = cv.getContext('2d');

// Conversion pouces → pixels du plateau.
export const px = v => v * PPI;
