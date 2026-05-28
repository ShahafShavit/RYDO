/** @typedef {'module' | 'ride' | 'permissions' | 'map' | 'location' | 'camera'} LiveRideBootMilestoneId */

/** @type {Record<LiveRideBootMilestoneId, { weight: number, label: string }>} */
export const LIVE_RIDE_BOOT_MILESTONES = {
  module: { weight: 15, label: 'Loading map viewer…' },
  ride: { weight: 15, label: 'Loading ride…' },
  permissions: { weight: 15, label: 'Checking permissions…' },
  map: { weight: 25, label: 'Preparing map…' },
  location: { weight: 20, label: 'Getting your location…' },
  camera: { weight: 10, label: 'Centering map…' },
};

/** @returns {Record<LiveRideBootMilestoneId, boolean>} */
export function createEmptyBootMilestones() {
  return {
    module: false,
    ride: false,
    permissions: false,
    map: false,
    location: false,
    camera: false,
  };
}

/**
 * @param {Record<LiveRideBootMilestoneId, boolean>} completed
 * @returns {number} 0–100
 */
export function liveRideBootProgress(completed) {
  return Object.entries(LIVE_RIDE_BOOT_MILESTONES).reduce(
    (sum, [id, { weight }]) => sum + (completed[id] ? weight : 0),
    0,
  );
}

/**
 * @param {Record<LiveRideBootMilestoneId, boolean>} completed
 * @returns {string}
 */
export function liveRideBootActiveLabel(completed) {
  for (const id of /** @type {LiveRideBootMilestoneId[]} */ (Object.keys(LIVE_RIDE_BOOT_MILESTONES))) {
    if (!completed[id]) return LIVE_RIDE_BOOT_MILESTONES[id].label;
  }
  return 'Ready';
}
