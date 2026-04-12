/**
 * Canonical bike type keys — keep in sync with server seed (DbSeeder.SeedUserPreferences).
 */
export const BIKE_TYPES = [
  { value: 'road', optionLabel: 'Road Bike', profileLabel: 'Road bike' },
  { value: 'mountain', optionLabel: 'Mountain Bike', profileLabel: 'Mountain bike' },
  { value: 'gravel', optionLabel: 'Gravel Bike', profileLabel: 'Gravel bike' },
  { value: 'hybrid', optionLabel: 'Hybrid', profileLabel: 'Hybrid' },
  { value: 'electric', optionLabel: 'Electric (E-bike)', profileLabel: 'Electric (e-bike)' },
  { value: 'touring', optionLabel: 'Touring', profileLabel: 'Touring bike' },
  { value: 'city', optionLabel: 'City / Commuter', profileLabel: 'City / commuter' },
];

export const BIKE_TYPE_PROFILE_LABELS = Object.fromEntries(
  BIKE_TYPES.map(({ value, profileLabel }) => [value, profileLabel])
);
