// ============================================================
//  Configuration — valeurs de jeu et constantes de réglage
// ============================================================

// --- Plateau
export const PPI = 30;      // pixels par pouce
export const BW = 30;       // largeur du plateau en pouces
export const BH = 22;       // hauteur du plateau en pouces
export const MAXTURN = 4;   // nombre de tours de la partie

// --- Figurines
export const BASE_RADIUS = 0.62;            // rayon de socle en pouces
export const ACTIONS_PER_ACTIVATION = 2;    // points d'action par activation

// --- Géométrie et règles
export const MOVE_EPSILON = 1e-6;             // tolérance flottante sur la distance de mouvement
export const TERRAIN_MARGIN_FACTOR = 0.92;    // réduction de la marge de collision socle/décor
export const SEGMENT_PARALLEL_EPSILON = 1e-9; // tolérance de parallélisme de deux segments
export const COVER_MIN_DISTANCE = 1;          // distance mini (pouces) pour qu'un décor bas donne le couvert

// --- Interaction
export const SELECT_MARGIN = 0.25;      // marge de sélection au clic au-delà du socle (pouces)
export const DRAG_MIN_DISTANCE = 0.15;  // distance mini de glisser pour déclencher un déplacement (pouces)

// --- Combat
export const CRIT_VALUE = 6;      // valeur de dé = critique
export const DEFENSE_DICE = 3;    // nombre de dés de sauvegarde
export const MIN_HIT_TARGET = 2;  // seuil de touche minimal (2+)

// --- Journal
export const JOURNAL_MAX = 6; // lignes conservées dans le journal

// --- Tremblement d'écran
export const SHAKE_DAMPING = 0.88; // amortissement par frame
export const SHAKE_MIN = 0.4;      // seuil en dessous duquel le tremblement est annulé

// --- Texture du tapis
export const MAT_TEXTURE_DOTS = 26000; // pixels de texture dessinés sur le tapis

// --- Animation de déplacement
export const MOVE_ANIM_BASE = 180;    // durée de base (ms)
export const MOVE_ANIM_PER_INCH = 55; // durée ajoutée par pouce parcouru (ms)

// --- Dés du panneau de combat
export const DIE_SPIN_INTERVAL = 55;        // intervalle de rotation avant la chute (ms)
export const DIE_START_X = 110;             // position X de départ des dés (px)
export const DIE_GAP = 44;                  // espacement horizontal entre deux dés (px)
export const DIE_ROW = { atk: 22, def: 92 }; // lignes Y des dés d'attaque et de défense (px)

// --- Vitesse d'animation
export const SPEED_FAST = 0.28; // facteur d'accélération quand le joueur clique pendant la résolution

// --- Durées d'affichage (ms)
export const FLASH_SIDE_MS = 1000;     // annonce de changement d'escouade
export const FLASH_TURN_MS = 1200;     // annonce de nouveau tour
export const TOAST_MS = 1500;          // message d'erreur toast
export const ENDSHOT_WAIT_DMG = 1250;  // attente après un tir ayant infligé des dégâts
export const ENDSHOT_WAIT_NODMG = 950; // attente après un tir sans dégât
