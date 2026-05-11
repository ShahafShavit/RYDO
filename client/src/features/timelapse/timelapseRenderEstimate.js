/**
 * Rough wall-clock seconds for headless capture + ffmpeg (actual time varies by CPU / disk).
 * @param {number} durationSec route duration
 * @param {number} fps export fps
 * @param {number} [frameSettleMs=45] matches server TIMELAPSE_FRAME_SETTLE_MS default
 */
export function estimateTimelapseRenderSeconds(durationSec, fps, frameSettleMs = 45) {
  const f = Math.min(60, Math.max(1, Number(fps) || 30));
  const frames = Math.ceil(Math.max(0.1, Number(durationSec) || 1) * f);
  const settleSec = frameSettleMs / 1000;
  const screenshotSec = 0.055;
  const captureSec = frames * (settleSec + screenshotSec);
  const encodeSec = Math.max(25, frames * 0.035);
  const bootSec = 40;
  return Math.round(captureSec + encodeSec + bootSec);
}
