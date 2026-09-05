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
export const SAVES_PER_CRIT = 2;  // sauvegardes normales nécessaires pour annuler une critique

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

// --- Dé à six faces
export const DICE_FACES = 6;

// --- Zones de déploiement (bandes colorées sur les bords du plateau)
export const DEPLOY_ZONE_WIDTH = 5;    // largeur en pouces
export const DEPLOY_ZONE_ALPHA = 0.06; // opacité de la teinte

// --- Cadence de la séquence de tir (ms, multipliés par la vitesse d'animation)
export const DIE_REVEAL_STEP = 130;   // révélation d'un dé, un par un
export const ATTACK_SETTLE = 120;     // pause après le jet d'attaque
export const ATTACK_NOTE_HOLD = 520;  // lecture du résultat d'attaque
export const DEFENSE_INTRO = 340;     // annonce « doit encaisser »
export const COVER_DIE_DELAY = 180;   // arrivée du dé de couvert
export const DEFENSE_NOTE_HOLD = 560; // lecture du résultat de défense
export const CANCEL_ALIGN = 260;      // alignement des dés avant annulation
export const CANCEL_POP = 240;        // disparition des dés annulés
export const DAMAGE_STEP = 230;       // décompte d'un dé de dégât
export const DAMAGE_SETTLE = 260;     // pause après le décompte des dégâts
export const DOWN_DELAY = 420;        // délai avant la mise hors de combat
export const SPIN_HOLD = 40;          // avant la chute des dés lancés
export const DIE_DROP_STEP = 80;      // décalage de chute entre deux dés
export const DROP_SETTLE = 380;       // pause de fin de lancer (+ DIE_DROP_STEP par dé)
export const DIE_LAND_HOLD = 160;     // pause après l'atterrissage final

// --- Durées des effets visuels (ms)
export const FX_MUZZLE_MS = 180;
export const FX_TRACER_MS = 230;
export const TRACER_STAGGER = 70;     // décalage entre deux traceurs
export const FX_SHIELD_MS = 420;
export const FX_IMPACT_MS = 420;
export const FX_FLOAT_DMG_MS = 1100;  // texte flottant « −N dégâts »
export const FX_FLOAT_DOWN_MS = 1400; // texte flottant « hors de combat »
export const FX_FLOAT_SAVE_MS = 1000; // texte flottant « encaissé »
export const FLOAT_DMG_SIZE = 28;     // taille du texte de dégâts
export const FLOAT_SMALL_SIZE = 20;   // taille des autres textes flottants
export const IMPACT_JITTER = 0.5;     // dispersion (pouces) des impacts autour de la cible
export const IMPACT_SEED_RANGE = 6;   // amplitude de la graine d'orientation des impacts

// --- Tremblement et flash au tir
export const SHAKE_HIT = 4.5;         // touche encaissée
export const SHAKE_CRIT = 7;          // critique encaissée
export const SHAKE_WOUND = 8;         // dégâts appliqués
export const TARGET_FLASH = 0.7;      // flash blanc de la figurine touchée

// --- Fréquences des sons de décompte (Hz)
export const TONE_CRIT_HZ = 720;
export const TONE_HIT_HZ = 600;

// --- Disposition des dés dans le panneau de combat (px)
export const DIE_MISS_DROP = 34;      // décalage vertical des dés ratés
export const DIE_MISS_ROT = 22;       // rotation ajoutée aux dés ratés
export const DIE_MISS_SCALE = 0.8;    // échelle des dés ratés
export const DIE_MISS_OPACITY = 0.28; // opacité des dés ratés
export const COVER_DIE_OFFSET = 16;   // décalage du dé de couvert au-delà des dés de défense
export const COVER_DIE_ROT = -6;      // rotation du dé de couvert
export const DIE_ENTER_LEFT = -140;   // X de départ des dés entrant par la gauche
export const DIE_ENTER_RIGHT = 700;   // X de départ des dés entrant par la droite
export const DIE_ENTER_JITTER_Y = 40; // dispersion verticale à l'entrée
export const DIE_ENTER_ROT = 260;     // rotation à l'entrée
export const DIE_ENTER_SCALE = 0.9;   // échelle à l'entrée
export const DIE_REST_ROT = 16;       // rotation au repos
