export const ROLES = ['admin', 'manager', 'reception', 'kitchen', 'restaurant', 'housekeeping'];

export const ROLE_MODULES = {
  admin: ['dashboard', 'rooms', 'bookings', 'guests', 'users', 'restaurant', 'pos', 'reports', 'assistant', 'settings'],
  manager: ['dashboard', 'rooms', 'bookings', 'guests', 'restaurant', 'pos', 'reports', 'assistant', 'settings'],
  reception: ['dashboard', 'rooms', 'bookings', 'guests', 'pos', 'reports'],
  kitchen: ['kitchen'],
  restaurant: ['restaurant', 'pos'],
  housekeeping: ['housekeeping', 'rooms'],
};

export function allowed(role, module) {
  if (!role) return false;
  const mods = ROLE_MODULES[role] || [];
  if (mods.includes('*') || mods.includes(module)) return true;
  return false;
}