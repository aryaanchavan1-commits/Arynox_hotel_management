export const ROLES = ['admin', 'manager', 'reception', 'kitchen', 'restaurant', 'housekeeping'];

export const ROLE_MODULES = {
  admin: ['dashboard', 'rooms', 'bookings', 'guests', 'users', 'restaurant', 'kitchen', 'housekeeping', 'pos', 'venue', 'channels', 'reports', 'assistant', 'settings'],
  manager: ['dashboard', 'rooms', 'bookings', 'guests', 'restaurant', 'kitchen', 'housekeeping', 'pos', 'venue', 'channels', 'reports', 'assistant', 'settings'],
  reception: ['dashboard', 'rooms', 'bookings', 'guests', 'pos', 'venue', 'channels', 'reports'],
  kitchen: ['kitchen'],
  restaurant: ['restaurant', 'pos', 'venue'],
  housekeeping: ['housekeeping', 'rooms'],
};

export function allowed(role, module) {
  if (!role) return false;
  const mods = ROLE_MODULES[role] || [];
  if (mods.includes('*') || mods.includes(module)) return true;
  return false;
}