import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weaponsForRole, isWeaponAllowed } from '../src/rules/loadout.js';

const loadouts = { meneur: ['pm', 'scie', 'bolter'], ligne: ['fusil', 'carabine', 'assaut'], appui: ['canon', 'sniper'] };

test('un rôle ne propose que les armes de son ensemble', () => {
  assert.deepEqual(weaponsForRole('meneur', loadouts), ['pm', 'scie', 'bolter']);
});

test('une arme hors de l\'ensemble du rôle est refusée', () => {
  assert.equal(isWeaponAllowed('meneur', 'canon', loadouts), false); // le canon n'est pas une arme de meneur
});

test('une arme de l\'ensemble du rôle est acceptée', () => {
  assert.equal(isWeaponAllowed('ligne', 'carabine', loadouts), true);
});
