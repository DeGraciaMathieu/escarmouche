// Ensemble d'armes (clés du catalogue) autorisées pour un rôle.
export const weaponsForRole = (role, loadouts) => loadouts[role] ?? [];

// Vrai si l'arme (clé) appartient à l'ensemble autorisé du rôle.
export const isWeaponAllowed = (role, key, loadouts) => weaponsForRole(role, loadouts).includes(key);
