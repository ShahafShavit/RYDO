/**
 * Single source of defaults for live-ride motion / smoothing (preview panel on `/live`).
 * Values match production constants in `liveRideDeadReckon`, hooks, and filters unless you override in UI.
 */

/**
 * @typedef {{
 *   key: string,
 *   label: string,
 *   description: string,
 *   domain: string,
 *   unit: string,
 *   step?: number,
 *   group: string,
 *   category: string,
 * }} LiveRideTuningFieldMeta
 */

/** @type {Record<string, number>} */
export const DEFAULT_LIVE_RIDE_MOTION_TUNING = {
  // —— Hook: frame timing / camera ——
  FOLLOW_CAMERA_MIN_MS: 45,
  PUCK_DISPLAY_MIN_MS: 33,
  RAF_DT_CAP_S: 0.12,

  // —— Hook: low-speed GPS branch ——
  LOW_SPEED_FREEZE_KMH: 5,
  LOW_SPEED_RECENTER_EVERY_N: 20,
  DRIFT_RESEED_ERROR_M: 22,
  DRIFT_RESEED_MIN_DURATION_MS: 10_000,
  DRIFT_RESEED_MIN_FIXES: 6,

  // —— Per-GPS-fix display EMA (α toward syn*) ——
  EMA_GPS_LOW_SPEED_FREEZE: 0.16,
  EMA_GPS_REJECT: 0.35,
  EMA_GPS_ACCEPT: 0.42,

  // —— Dead reckon / stationary display ——
  MIN_MAP_MOTION_SPEED_MPS: 2 / 3.6,
  MIN_MAP_MOTION_SPEED_EXIT_MPS: (2 / 3.6) * 1.15,
  HEADING_DISPLAY_SMOOTH: 0.02,
  DR_MIN_SPEED_MPS: 0.35,
  DR_CORRECTION_BLEND: 0.42,
  DR_MAX_CORRECTION_STEP_M: 16,
  DR_DISPLAY_EMA_ALPHA: 0.2,

  // —— GPS accuracy scaling (pull toward fix) ——
  ACC_SCALE_NUMERATOR: 12,
  ACC_SCALE_FLOOR_M: 8,
  ACC_SCALE_MIN: 0.25,

  // —— Kinematic gate ——
  KIN_A_MAX_MS2: 24.5,
  KIN_DT_MIN_S: 0.05,
  KIN_DT_MAX_S: 8,
  KIN_GAP_RESEED_MS: 10_000,
  KIN_V_MAX_MPS: 35,
  KIN_STATIONARY_MAX_M: 2,
  KIN_VEL_SMOOTH: 0.42,
  KIN_SPEED_HINT_BLEND: 0.38,
  KIN_SPEED_HINT_MIN_MPS: 0.9,
  KIN_REJECT_SPEED_DECAY_PER_S: 2.8,
  KIN_V_MAX_HINT_SCALE: 1.12,
  KIN_HINT_AGREE_MAX_DV_BASE: 2.2,
  KIN_HINT_AGREE_FRAC: 0.35,
  DECAY_REJECT_BLEND_CAP: 0.85,

  INFER_SEED_IMPLIED_SPEED_MPS: 7.5,
  INFER_SEED_DT_FLOOR_S: 0.35,

  // —— Speed filter (median + EMA + zero latch) ——
  SPEED_FILTER_MEDIAN_WINDOW: 3,
  SPEED_FILTER_EMA_ALPHA: 0.45,
  SPEED_FILTER_ZERO_ENTER_MPS: 0.55,
  SPEED_FILTER_ZERO_EXIT_MPS: 0.7,

  // —— Compass vs GPS heading blend ——
  HEADING_BLEND_LOW_KMH: 5,
  HEADING_BLEND_HIGH_KMH: 10,

  // —— Nearby riders cone (replay HUD) ——
  CONE_MIN_SPEED_KMH: 7,

  // —— GPX/KML replay sample builder (next file load) ——
  REPLAY_DEFAULT_STEP_MS_NO_TIME: 800,
  REPLAY_MIN_DT_S: 0.05,
  REPLAY_ACCURACY_M: 4,

  // —— /live preview: uncertainty footprint overlay only ——
  PREVIEW_UNCERTAINTY_STATIONARY_DIAMETER_M: 24,
  PREVIEW_UNCERTAINTY_SPEED_FULL_MPS: 5,
  PREVIEW_UNCERTAINTY_HALF_ANGLE_MIN_DEG: 12,
  PREVIEW_UNCERTAINTY_HALF_ANGLE_MAX_DEG: 55,
  PREVIEW_UNCERTAINTY_RANGE_MIN_M: 12,
  PREVIEW_UNCERTAINTY_RANGE_MAX_M: 45,
};

/**
 * @param {Partial<typeof DEFAULT_LIVE_RIDE_MOTION_TUNING> | null | undefined} partial
 * @returns {typeof DEFAULT_LIVE_RIDE_MOTION_TUNING}
 */
export function mergeLiveRideMotionTuning(partial) {
  return { ...DEFAULT_LIVE_RIDE_MOTION_TUNING, ...partial };
}

/**
 * @param {typeof DEFAULT_LIVE_RIDE_MOTION_TUNING} tuning
 * @returns {string}
 */
export function exportTuningAsTxt(tuning) {
  const lines = [
    '# RYDO — Live ride preview tuning export',
    `# Generated: ${new Date().toISOString()}`,
    '# One key=value per line. Values are numbers (integers where noted).',
    '',
  ];
  const keys = Object.keys(DEFAULT_LIVE_RIDE_MOTION_TUNING).sort();
  for (const k of keys) {
    const v = tuning[k];
    lines.push(`${k}=${typeof v === 'number' ? v : DEFAULT_LIVE_RIDE_MOTION_TUNING[k]}`);
  }
  return `${lines.join('\n')}\n`;
}

/** Display order for the preview panel (top-level accordion). */
export const LIVE_RIDE_TUNING_CATEGORY_ORDER = [
  'Timing & camera',
  'GPS: low speed & drift',
  'Per-fix smoothing (EMA)',
  'Stationary map & puck freeze',
  'Heading & bearing',
  'Dead reckoning & on-screen EMA',
  'GPS accuracy weighting',
  'Kinematic gate',
  'Seed & first fixes',
  'Speed filter (median + latch)',
  'Preview overlay (uncertainty)',
  'Replay file & HUD',
];

/** @type {LiveRideTuningFieldMeta[]} */

export const LIVE_RIDE_TUNING_FIELD_META = [
  {
    category: 'Timing & camera',
    group: 'Frame & camera (rAF)',
    key: 'FOLLOW_CAMERA_MIN_MS',
    label: 'Follow camera min interval',
    description:
      'Minimum milliseconds between imperative map camera jumps while following the puck. Higher = fewer camera updates, smoother but laggier.',
    domain: '[1, 200] typical; lower = more responsive',
    unit: 'ms',
    step: 1,
  },
  {
    category: 'Timing & camera',
    group: 'Frame & camera (rAF)',
    key: 'PUCK_DISPLAY_MIN_MS',
    label: 'Puck React update throttle',
    description: 'Minimum time between React state updates for puck position from the rAF loop.',
    domain: '[16, 200]',
    unit: 'ms',
    step: 1,
  },
  {
    category: 'Timing & camera',
    group: 'Frame & camera (rAF)',
    key: 'RAF_DT_CAP_S',
    label: 'Max simulation dt per frame',
    description: 'Caps delta-time used inside the motion tick to avoid huge jumps after a tab background.',
    domain: '(0, 0.5]',
    unit: 's',
    step: 0.01,
  },
  {
    category: 'GPS: low speed & drift',
    group: 'Low-speed GPS branch',
    key: 'LOW_SPEED_FREEZE_KMH',
    label: 'Low-speed freeze threshold',
    description:
      'Below this ground speed (from filtered GPS speed), the rider is treated as stationary: velocity zeroed, drift / recenter logic runs.',
    domain: '[0, 25] km/h',
    unit: 'km/h',
    step: 0.5,
  },
  {
    category: 'GPS: low speed & drift',
    group: 'Low-speed GPS branch',
    key: 'LOW_SPEED_RECENTER_EVERY_N',
    label: 'Recenter every N fixes',
    description: 'While frozen, every Nth GPS update may snap synthetic position toward the raw fix (low-speed recenter).',
    domain: '[1, 100] integers',
    unit: 'count',
    step: 1,
  },
  {
    category: 'GPS: low speed & drift',
    group: 'Low-speed GPS branch',
    key: 'DRIFT_RESEED_ERROR_M',
    label: 'Drift error threshold',
    description: 'Meters between synthetic and GPS before drift lock starts counting.',
    domain: '[5, 80]',
    unit: 'm',
    step: 1,
  },
  {
    category: 'GPS: low speed & drift',
    group: 'Low-speed GPS branch',
    key: 'DRIFT_RESEED_MIN_DURATION_MS',
    label: 'Hard reseed drift duration',
    description: 'If drift persists longer than this, a hard reseed may snap to GPS.',
    domain: '[1000, 120000]',
    unit: 'ms',
    step: 500,
  },
  {
    category: 'GPS: low speed & drift',
    group: 'Low-speed GPS branch',
    key: 'DRIFT_RESEED_MIN_FIXES',
    label: 'Hard reseed drift fix count',
    description: 'Minimum consecutive drift samples before hard reseed.',
    domain: '[1, 30]',
    unit: 'count',
    step: 1,
  },
  {
    category: 'Per-fix smoothing (EMA)',
    group: 'Per-fix display EMA',
    key: 'EMA_GPS_LOW_SPEED_FREEZE',
    label: 'EMA α — low-speed branch',
    description: 'Blend factor toward kinematic syn* after each fix while in the low-speed frozen branch.',
    domain: '[0.05, 0.6]',
    unit: '0–1',
    step: 0.01,
  },
  {
    category: 'Per-fix smoothing (EMA)',
    group: 'Per-fix display EMA',
    key: 'EMA_GPS_REJECT',
    label: 'EMA α — kinematic reject',
    description: 'Blend toward syn* when the kinematic gate rejects a fix (keep smooth pose).',
    domain: '[0.1, 0.8]',
    unit: '0–1',
    step: 0.01,
  },
  {
    category: 'Per-fix smoothing (EMA)',
    group: 'Per-fix display EMA',
    key: 'EMA_GPS_ACCEPT',
    label: 'EMA α — accepted fix',
    description: 'Blend toward syn* after an accepted GPS fix (before stationary freeze).',
    domain: '[0.1, 0.8]',
    unit: '0–1',
    step: 0.01,
  },
  {
    category: 'Stationary map & puck freeze',
    group: 'Stationary display freeze',
    key: 'MIN_MAP_MOTION_SPEED_MPS',
    label: 'Enter stationary (speed)',
    description:
      'Smoothed DR speed below this activates stationary map/hub freeze: puck lat/lng snap to a snapshot. Heading shown is still driven by the heading blend + rAF smooth (see Heading & bearing)—not locked to the snapshot unless bearing falls back to it.',
    domain: '[0, 3] m/s',
    unit: 'm/s',
    step: 0.05,
  },
  {
    category: 'Stationary map & puck freeze',
    group: 'Stationary display freeze',
    key: 'MIN_MAP_MOTION_SPEED_EXIT_MPS',
    label: 'Exit stationary (speed)',
    description: 'Must exceed this to leave stationary (hysteresis above enter threshold).',
    domain: '[0, 4] m/s',
    unit: 'm/s',
    step: 0.05,
  },
  {
    category: 'Heading & bearing',
    group: 'Heading display',
    key: 'HEADING_DISPLAY_SMOOTH',
    label: 'Heading display smooth',
    description:
      'Each rAF, rotates `displayHeadingDeg` a fraction of the shortest arc toward `extrapolateHeadingDeg` (from compass/GPS blend). Lower = calmer rotation; higher = snappier. Main on-screen smoothing for avatar bearing while stationary—compass noise still moves the target unless blend favors GPS.',
    domain: '[0.02, 0.5]',
    unit: '0–1',
    step: 0.01,
  },
  {
    category: 'Dead reckoning & on-screen EMA',
    group: 'Dead reckoning (rAF)',
    key: 'DR_MIN_SPEED_MPS',
    label: 'Min DR extrapolation speed',
    description: 'Below this smoothed speed, dead-reckon step along heading is skipped.',
    domain: '[0, 2]',
    unit: 'm/s',
    step: 0.05,
  },
  {
    category: 'Dead reckoning & on-screen EMA',
    group: 'Pull toward GPS',
    key: 'DR_CORRECTION_BLEND',
    label: 'Synthetic pull blend',
    description: 'Base fraction of error closed toward each accepted GPS fix (scaled by accuracy).',
    domain: '[0.1, 0.9]',
    unit: '0–1',
    step: 0.01,
  },
  {
    category: 'Dead reckoning & on-screen EMA',
    group: 'Pull toward GPS',
    key: 'DR_MAX_CORRECTION_STEP_M',
    label: 'Max correction step',
    description: 'Cap meters moved toward GPS in one fix (before accuracy scale).',
    domain: '[4, 80]',
    unit: 'm',
    step: 1,
  },
  {
    category: 'Dead reckoning & on-screen EMA',
    group: 'Display vs kinematic (rAF)',
    key: 'DR_DISPLAY_EMA_ALPHA',
    label: 'Display EMA α (rAF)',
    description: 'Each frame, display lat/lng blend toward syn*; lower = smoother puck trail.',
    domain: '[0.05, 0.55]',
    unit: '0–1',
    step: 0.01,
  },
  {
    category: 'GPS accuracy weighting',
    group: 'Accuracy scale',
    key: 'ACC_SCALE_NUMERATOR',
    label: 'Accuracy scale numerator',
    description: 'Larger reported GPS accuracy (m) reduces blend; this controls the curve (see ACC_SCALE_FLOOR_M).',
    domain: '[4, 40]',
    unit: 'm',
    step: 1,
  },
  {
    category: 'GPS accuracy weighting',
    group: 'Accuracy scale',
    key: 'ACC_SCALE_FLOOR_M',
    label: 'Accuracy scale floor',
    description: 'Denominator clamp in accuracy-based scale (poor GPS above this gets reduced pull).',
    domain: '[4, 40]',
    unit: 'm',
    step: 1,
  },
  {
    category: 'GPS accuracy weighting',
    group: 'Accuracy scale',
    key: 'ACC_SCALE_MIN',
    label: 'Minimum accuracy scale',
    description: 'Never scale correction below this fraction (poor GPS still moves somewhat).',
    domain: '[0.1, 1]',
    unit: '0–1',
    step: 0.05,
  },
  {
    category: 'Kinematic gate',
    group: 'Kinematic gate',
    key: 'KIN_A_MAX_MS2',
    label: 'Max acceleration',
    description: 'Plausible cyclist accel bound for rejecting impossible velocity jumps between fixes.',
    domain: '[5, 50] m/s²',
    unit: 'm/s²',
    step: 0.5,
  },
  {
    category: 'Kinematic gate',
    group: 'Kinematic gate',
    key: 'KIN_DT_MIN_S',
    label: 'Min Δt',
    description: 'Lower clamp on time delta between fixes when gating.',
    domain: '[0.02, 0.3]',
    unit: 's',
    step: 0.01,
  },
  {
    category: 'Kinematic gate',
    group: 'Kinematic gate',
    key: 'KIN_DT_MAX_S',
    label: 'Max Δt',
    description: 'Upper clamp on Δt for gating and kinematics.',
    domain: '[1, 30]',
    unit: 's',
    step: 0.5,
  },
  {
    category: 'Kinematic gate',
    group: 'Kinematic gate',
    key: 'KIN_GAP_RESEED_MS',
    label: 'Gap reseed (ms)',
    description: 'If no fix for longer than this, next fix is accepted as gap reseed.',
    domain: '[2000, 60000]',
    unit: 'ms',
    step: 500,
  },
  {
    category: 'Kinematic gate',
    group: 'Kinematic gate',
    key: 'KIN_V_MAX_MPS',
    label: 'Max implied speed',
    description: 'Ceiling for bounding max distance between fixes.',
    domain: '[10, 60] m/s',
    unit: 'm/s',
    step: 1,
  },
  {
    category: 'Kinematic gate',
    group: 'Kinematic gate',
    key: 'KIN_STATIONARY_MAX_M',
    label: 'Stationary gate radius',
    description: 'Moves smaller than this are treated as stationary noise (always accepted).',
    domain: '[0, 10]',
    unit: 'm',
    step: 0.5,
  },
  {
    category: 'Kinematic gate',
    group: 'Kinematic gate',
    key: 'KIN_VEL_SMOOTH',
    label: 'Velocity EMA blend',
    description: 'Smoothing on ENU velocity after accepted fix (0 = only implied, 1 = keep old).',
    domain: '[0, 0.95]',
    unit: '0–1',
    step: 0.02,
  },
  {
    category: 'Kinematic gate',
    group: 'Kinematic gate',
    key: 'KIN_SPEED_HINT_BLEND',
    label: 'GPS speed hint blend',
    description: 'When GPS speed agrees with implied, blend toward GPS magnitude.',
    domain: '[0, 0.9]',
    unit: '0–1',
    step: 0.02,
  },
  {
    category: 'Kinematic gate',
    group: 'Kinematic gate',
    key: 'KIN_SPEED_HINT_MIN_MPS',
    label: 'Speed hint min',
    description: 'Ignore speed-hint blending when implied/hint speeds are below this.',
    domain: '[0, 3]',
    unit: 'm/s',
    step: 0.1,
  },
  {
    category: 'Kinematic gate',
    group: 'Kinematic gate',
    key: 'KIN_REJECT_SPEED_DECAY_PER_S',
    label: 'Reject speed decay',
    description: 'Per-second decay factor for speed when fixes are rejected (rAF).',
    domain: '[0.5, 8]',
    unit: '1/s',
    step: 0.1,
  },
  {
    category: 'Kinematic gate',
    group: 'Kinematic gate',
    key: 'KIN_V_MAX_HINT_SCALE',
    label: 'Implied velocity cap scale',
    description: 'Caps implied velocity vector at KIN_V_MAX_MPS × this when updating kinematics.',
    domain: '[1, 1.3]',
    unit: 'factor',
    step: 0.01,
  },
  {
    category: 'Kinematic gate',
    group: 'Kinematic gate',
    key: 'KIN_HINT_AGREE_MAX_DV_BASE',
    label: 'Hint agree Δv base',
    description: 'Tolerance for treating GPS speed as “agreeing” with implied (absolute floor).',
    domain: '[0.5, 6] m/s',
    unit: 'm/s',
    step: 0.1,
  },
  {
    category: 'Kinematic gate',
    group: 'Kinematic gate',
    key: 'KIN_HINT_AGREE_FRAC',
    label: 'Hint agree fraction',
    description: 'Fraction of max(speed,hint) added to tolerance for hint agreement.',
    domain: '[0.1, 0.8]',
    unit: '0–1',
    step: 0.05,
  },
  {
    category: 'Kinematic gate',
    group: 'Kinematic gate',
    key: 'DECAY_REJECT_BLEND_CAP',
    label: 'Reject decay cap',
    description: 'Caps the per-step multiplicative decay when rejecting fixes.',
    domain: '[0.3, 0.99]',
    unit: '0–1',
    step: 0.01,
  },
  {
    category: 'Seed & first fixes',
    group: 'Seed Δt (first fixes)',
    key: 'INFER_SEED_IMPLIED_SPEED_MPS',
    label: 'Seed implied speed',
    description: 'Used to infer Δt from distance when seeding: nominal = distance / this.',
    domain: '[3, 15]',
    unit: 'm/s',
    step: 0.5,
  },
  {
    category: 'Seed & first fixes',
    group: 'Seed Δt (first fixes)',
    key: 'INFER_SEED_DT_FLOOR_S',
    label: 'Seed Δt floor',
    description: 'Minimum inferred Δt (seconds) for seeding.',
    domain: '[0.1, 2]',
    unit: 's',
    step: 0.05,
  },
  {
    category: 'Speed filter (median + latch)',
    group: 'Speed filter',
    key: 'SPEED_FILTER_MEDIAN_WINDOW',
    label: 'Median window',
    description: 'Number of raw speed samples for median (odd integer recommended). Changing resets filter state on replay.',
    domain: '[1, 9] odd',
    unit: 'samples',
    step: 1,
  },
  {
    category: 'Speed filter (median + latch)',
    group: 'Speed filter',
    key: 'SPEED_FILTER_EMA_ALPHA',
    label: 'Speed EMA α',
    description: 'EMA blend on median speed toward display; higher = snappier speed.',
    domain: '[0.1, 0.9]',
    unit: '0–1',
    step: 0.02,
  },
  {
    category: 'Speed filter (median + latch)',
    group: 'Speed filter',
    key: 'SPEED_FILTER_ZERO_ENTER_MPS',
    label: 'Zero latch enter',
    description: 'Filtered speed below this latches to zero output (stationary).',
    domain: '[0.2, 1.5]',
    unit: 'm/s',
    step: 0.05,
  },
  {
    category: 'Speed filter (median + latch)',
    group: 'Speed filter',
    key: 'SPEED_FILTER_ZERO_EXIT_MPS',
    label: 'Zero latch exit',
    description: 'Must exceed this to leave zero latch (hysteresis).',
    domain: '[0.3, 2]',
    unit: 'm/s',
    step: 0.05,
  },
  {
    category: 'Heading & bearing',
    group: 'Heading blend (compass vs GPS)',
    key: 'HEADING_BLEND_LOW_KMH',
    label: 'Compass-only below',
    description:
      'Below this ground speed (km/h), blend weight favors device compass. Primary cause of twitchy bearing when stopped: magnetometer noise. Raise toward GPS/course earlier by increasing this (with filtered speed stable).',
    domain: '[0, 15]',
    unit: 'km/h',
    step: 0.5,
  },
  {
    category: 'Heading & bearing',
    group: 'Heading blend (compass vs GPS)',
    key: 'HEADING_BLEND_HIGH_KMH',
    label: 'GPS-only above',
    description:
      'At/above this speed, blend weight is full GPS/course. Between low and high, weights interpolate (circular blend). COG can be unstable at very low movement—keep above compass-dominant band for moving ride.',
    domain: '[5, 40]',
    unit: 'km/h',
    step: 0.5,
  },
  {
    category: 'Preview overlay (uncertainty)',
    group: 'Uncertainty footprint',
    key: 'PREVIEW_UNCERTAINTY_STATIONARY_DIAMETER_M',
    label: 'Stationary circle diameter',
    description:
      'When smoothed speed is below the stationary map threshold, overlay is a circle with this diameter (meters).',
    domain: '[4, 120]',
    unit: 'm',
    step: 1,
  },
  {
    category: 'Preview overlay (uncertainty)',
    group: 'Uncertainty footprint',
    key: 'PREVIEW_UNCERTAINTY_SPEED_FULL_MPS',
    label: 'Speed at full cone shape',
    description:
      'Smoothed speed (m/s) at which the sector uses minimum half-angle and maximum range interpolation (smoothstep from stationary circle).',
    domain: '[0.5, 25]',
    unit: 'm/s',
    step: 0.5,
  },
  {
    category: 'Preview overlay (uncertainty)',
    group: 'Uncertainty footprint',
    key: 'PREVIEW_UNCERTAINTY_HALF_ANGLE_MIN_DEG',
    label: 'Half-angle at high speed',
    description: 'Narrower sector half-angle (degrees) when speed approaches full; forward direction is clearer.',
    domain: '[4, 85]',
    unit: 'deg',
    step: 1,
  },
  {
    category: 'Preview overlay (uncertainty)',
    group: 'Uncertainty footprint',
    key: 'PREVIEW_UNCERTAINTY_HALF_ANGLE_MAX_DEG',
    label: 'Half-angle at low speed',
    description: 'Wider sector half-angle (degrees) when just above stationary; blends toward circle when speed is low.',
    domain: '[10, 175]',
    unit: 'deg',
    step: 1,
  },
  {
    category: 'Preview overlay (uncertainty)',
    group: 'Uncertainty footprint',
    key: 'PREVIEW_UNCERTAINTY_RANGE_MIN_M',
    label: 'Sector range (slow)',
    description: 'Along-ground range (meters) to arc at the moving threshold (start of wedge).',
    domain: '[4, 80]',
    unit: 'm',
    step: 1,
  },
  {
    category: 'Preview overlay (uncertainty)',
    group: 'Uncertainty footprint',
    key: 'PREVIEW_UNCERTAINTY_RANGE_MAX_M',
    label: 'Sector range (fast)',
    description: 'Along-ground range (meters) at PREVIEW_UNCERTAINTY_SPEED_FULL_MPS and above.',
    domain: '[8, 200]',
    unit: 'm',
    step: 1,
  },
  {
    category: 'Replay file & HUD',
    group: 'Replay HUD',
    key: 'CONE_MIN_SPEED_KMH',
    label: 'Nearby cone min speed',
    description: 'Ahead/behind cone logic disabled below this speed (replay UI only).',
    domain: '[0, 25]',
    unit: 'km/h',
    step: 0.5,
  },
  {
    category: 'Replay file & HUD',
    group: 'Replay file (next load)',
    key: 'REPLAY_DEFAULT_STEP_MS_NO_TIME',
    label: 'Uniform step (no timestamps)',
    description: 'Milliseconds between synthetic fixes when GPX/KML has no per-point times.',
    domain: '[100, 5000]',
    unit: 'ms',
    step: 50,
  },
  {
    category: 'Replay file & HUD',
    group: 'Replay file (next load)',
    key: 'REPLAY_MIN_DT_S',
    label: 'Min segment Δt',
    description: 'Minimum seconds between consecutive replay points when computing speed from distance.',
    domain: '[0.02, 0.5]',
    unit: 's',
    step: 0.01,
  },
  {
    category: 'Replay file & HUD',
    group: 'Replay file (next load)',
    key: 'REPLAY_ACCURACY_M',
    label: 'Synthetic accuracy',
    description: 'Reported accuracy (m) for replay fixes fed into the motion pipeline.',
    domain: '[2, 30]',
    unit: 'm',
    step: 1,
  },
];

/**
 * Nested structure for the `/live` panel: categories → subgroups → fields.
 * @returns {{ category: string, groups: { groupName: string, fields: LiveRideTuningFieldMeta[] }[] }[]}
 */
export function groupTuningMetaByCategory() {
  /** @type {Map<string, Map<string, LiveRideTuningFieldMeta[]>>} */
  const byCat = new Map();
  for (const f of LIVE_RIDE_TUNING_FIELD_META) {
    let gm = byCat.get(f.category);
    if (!gm) {
      gm = new Map();
      byCat.set(f.category, gm);
    }
    const list = gm.get(f.group) || [];
    list.push(f);
    gm.set(f.group, list);
  }

  /** @type {{ category: string, groups: { groupName: string, fields: LiveRideTuningFieldMeta[] }[] }[]} */
  const out = [];
  const seen = new Set();
  for (const cat of LIVE_RIDE_TUNING_CATEGORY_ORDER) {
    const gm = byCat.get(cat);
    if (!gm) continue;
    seen.add(cat);
    out.push({
      category: cat,
      groups: [...gm.entries()].map(([groupName, fields]) => ({ groupName, fields })),
    });
  }
  for (const [cat, gm] of byCat) {
    if (seen.has(cat)) continue;
    out.push({
      category: cat,
      groups: [...gm.entries()].map(([groupName, fields]) => ({ groupName, fields })),
    });
  }
  return out;
}

/**
 * Flat map keyed by subgroup label (unique in this project). Kept for callers that need a simple grouping.
 * @returns {Map<string, LiveRideTuningFieldMeta[]>}
 */
export function groupTuningMeta() {
  /** @type {Map<string, LiveRideTuningFieldMeta[]>} */
  const m = new Map();
  for (const f of LIVE_RIDE_TUNING_FIELD_META) {
    const list = m.get(f.group) || [];
    list.push(f);
    m.set(f.group, list);
  }
  return m;
}
