# Live ride map: rider position

The live map centers on the route polyline for context, but **your avatar position comes from GPS**, not from the first point of the route geometry.

Seeding kinematics at the polyline start was removed: riders can join a live ride while already partway along the route (or off the line). The dead-reckoning + kinematic gate in `RideLiveMapPage` / `liveRideDeadReckon.js` assumes motion from a real prior fix; a false anchor at the route origin caused rejects or very slow convergence.

Implementation: `onMapLoad` only moves the map camera; the first `watchPosition` callback initializes `deadReckonRef` and the puck.

## Smoothing (noise reduction)

Tunable constants in [`liveRideDeadReckon.js`](../src/features/live-ride/utils/liveRideDeadReckon.js):

| Constant | Role |
|----------|------|
| `DR_CORRECTION_BLEND` / `DR_MAX_CORRECTION_STEP_M` | How aggressively each accepted GPS fix pulls the **kinematic** point (`syn*`) toward the fix; lower = smoother, more lag. |
| `correctionAccuracyScale` | Poor `coords.accuracy` (large meters) automatically reduces blend and max step. |
| `DR_DISPLAY_EMA_ALPHA` | Per-frame exponential smoothing of **display** position toward `syn*` (puck, follow camera, `sendPose`). Lower = silkier motion, more lag. |
| `HEADING_DISPLAY_SMOOTH` | Shortest-path turn per frame toward `extrapolateHeadingDeg` (device heading / course), stored as `displayHeadingDeg` — avoids avatar rotation snapping between GPS updates. |
| `MIN_MAP_MOTION_SPEED_MPS` / `MIN_MAP_MOTION_SPEED_EXIT_MPS` | Below ~2 km/h (with ~15% hysteresis to exit), the puck, follow camera, and hub `sendPose` use a **frozen snapshot** so GPS noise does not jitter the UI or peers while stationary. `watchPosition` keeps polling. |

Kinematic gating (`evaluateKinematicGate`) is unchanged; smoothing applies after accepted fixes.

## Heading: compass / GPS blend

On each **accepted** GPS fix, `extrapolateHeadingDeg` is set from [`blendHeadingBySpeedKmh`](../src/features/live-ride/utils/liveRideHeadingBlend.js) using:

- **Compass:** device orientation ([`liveRideCompass.js`](../src/features/live-ride/utils/liveRideCompass.js)), updated via `subscribeDeviceCompass` while the live hub is active.
- **GPS / course:** `coords.heading` when finite, otherwise bearing from the previous fix to the current one (same idea as before; no stale extrapolation mixed into the “GPS” input for blending).
- **Speed:** smoothed `deadReckonRef.speedMps` after `updateAcceptedKinematics`, converted to km/h (`× 3.6`).

Blend bands (ground speed):

| Speed | Behavior |
|-------|----------|
| &lt; 5 km/h | Compass only (if no compass, course / GPS heading only). |
| 5–10 km/h | Circular blend from compass toward GPS/course. |
| ≥ 10 km/h | GPS/course only (if missing, compass only). |

Nearby “ahead / behind” uses the same display bearing as the puck (`puckDisplay.bearing` when available).

## Permissions (live ride entry)

Tapping **Live map** on the ride event runs [`requestLiveRidePermissions`](../src/features/live-ride/utils/requestLiveRidePermissions.js): iOS Safari **motion/orientation** (`DeviceOrientationEvent.requestPermission` when available) and a one-shot **geolocation** read so browser prompts appear before navigating. Outcomes are stored in `sessionStorage` under `rydoLiveRideOrientation` for the map page.

If the user opens the live URL directly (deep link), iOS may still require a gesture: the map shows a small **Enable** compass call-to-action until motion is granted, denied, or dismissed.

HTTPS (or localhost) is still required for geolocation; see [lan-https-phone.md](./lan-https-phone.md).
