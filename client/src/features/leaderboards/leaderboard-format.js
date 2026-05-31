export const LB_RING = {
  1: 'rgba(240,178,74,0.95)',
  2: 'rgba(195,205,215,0.9)',
  3: 'rgba(186,124,72,0.95)',
};

export function formatLeaderboardValue(row, formatKm, formatElevation) {
  if (row.unit === 'km') return formatKm(row.value, 1);
  if (row.unit === 'm') return formatElevation(row.value, 0);
  if (row.unit === 'rides' || row.unit === 'routes') return String(Math.round(row.value));
  return String(row.value);
}
