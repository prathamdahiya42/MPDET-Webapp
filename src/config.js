export const config = {
  // Profiles matching these names blur their merit and contact details until unlocked
  ownerLockedNames: ['pratham dahiya'],
  // Default app settings
  appName: 'MPDET Predictor & Hostel Allotment',
  academicSession: '2026-27'
};

export function isOwnerLocked(name) {
  if (!name) return false;
  const n = String(name).trim().toLowerCase();
  return config.ownerLockedNames.some(locked => locked.toLowerCase() === n);
}
