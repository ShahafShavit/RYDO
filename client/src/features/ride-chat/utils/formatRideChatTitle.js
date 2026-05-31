export const GROUP_RIDE_LABEL = 'Group ride';

export function formatRideChatTitle(rideName, clubName) {
  const name = (rideName || 'Ride').trim();
  const suffix = (clubName || '').trim() || GROUP_RIDE_LABEL;
  return `${name} @ ${suffix}`;
}
