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

Kinematic gating (`evaluateKinematicGate`) is unchanged; smoothing applies after accepted fixes.
