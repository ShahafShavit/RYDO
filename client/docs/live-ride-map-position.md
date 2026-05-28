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

## Live hub connectivity (SignalR)

Peer positions on the map come from `/hubs/ride-live` (`useRideLiveHub.js`), not from distance filtering. After a network drop, the client must call `JoinRide` again on the **new** connection; the status chip reflects that lifecycle.

### Join and first visibility

`JoinRide` accepts an optional initial pose: `(rideId, lat?, lng?, headingDeg?, accuracyM?, atUtc?)`.

- While the hub is connecting, GPS fixes are **buffered** in `pendingPoseRef` (even when `sendPose` cannot invoke yet).
- On `JoinRide`, the client passes the buffered pose when lat/lng are valid. The server stores it and broadcasts `RiderMoved` to the group immediately (no rate limit on join).
- If the client has no GPS yet, join still succeeds; the first post-join `UpdatePose` is not blocked by the usual send throttle.
- On reconnect within the ~45s disconnect grace, if no new GPS is available the server re-broadcasts the stored pose so peers refresh without waiting for the next `UpdatePose`.

Expect a new joiner to appear on other devices within ~1–2s of their first GPS fix (not 5–15s).

| Status | Meaning |
|--------|---------|
| Connecting… / Syncing riders… | Socket up; joining the ride group |
| Reconnecting… | Automatic reconnect in progress |
| Live | Joined; receiving `RiderMoved` (peer count is in the bottom panel) |
| Disconnected / Connection failed | Use **Retry** or leave and re-enter the live map |

Brief disconnects keep your pose on other riders’ maps for ~45s (server grace) before `RiderLeft` fires.

### Stale riders (no GPS / silent dropout)

If a joined rider stops sending `UpdatePose` for **25 seconds** (server-side, `RideLivePoseStore.DefaultPoseStaleSeconds`), the server marks their pose `isStale: true` and broadcasts `RiderMoved` with the last lat/lng. This covers minimized mobile browsers where the WebSocket may stay up but GPS stops.

| State | Map | Nearby panel (expanded) |
|-------|-----|-------------------------|
| Active (`isStale: false`) | Normal peer avatar | Ahead / behind / nearest as today |
| Stale (`isStale: true`) | Grayscale + 50% opacity | **Connection lost** list: muted name, distance, red **X** |
| Left (`RiderLeft` after ~45s disconnect grace) | Removed | Removed |

- Stale peers are **excluded** from ahead/behind cone logic but still count in “N other riders on the map”.
- **Recovery hysteresis** (avoids flicker): while stale, the server keeps `isStale: true` until **two** successful `UpdatePose`/`SetPose` calls **or** **5 seconds** after the first recovery pose (`StaleRecoveryMinPoses` / `StaleRecoveryGraceSeconds`). Hub broadcasts use the stored pose from `SetPose`, not the raw incoming DTO.
- Wire payloads (`RidersState`, `RiderMoved`) include `isStale` via `RideLiveWire.Pose`.

**Manual test (stale):**

1. A and B on live map; B sees A moving.
2. A backgrounds app or stops GPS for **>25s** → B: A’s marker grays out; **Connection lost** shows A (red X + distance).
3. A returns to foreground with GPS → after ~2 poses or ~5s, A’s marker normal; A leaves **Connection lost**.
4. A airplane mode until hub drops → after disconnect grace, `RiderLeft` removes A (unchanged).

### Debug logging

- Append `?debugRideLive=1` to the live map URL once (persists via `localStorage`).
- In dev, `[rydo:ride-live]` logs are always on.
- After every `SignalR reconnected`, expect `JoinRide invoke OK` with `hadPendingPose: true/false`.

### Manual test (two devices, same upcoming ride)

1. Device A already live; device B opens live map → B sees A quickly; A sees B within ~1–2s of B’s first GPS fix (bottom panel peer count updates).
2. Both open live map at once → both peer counts rise within a few seconds without refresh.
3. Airplane mode on device A ~10s → A shows **Reconnecting…** then **Syncing…** then **Live**; B should not lose A permanently during the gap.
4. After reconnect, A’s peer count returns within a few seconds.
5. Background tab A ~30s → foreground → auto-retry or **Retry**; if WS stays up, B may see A as **stale** after ~25s without GPS (see stale test above).
6. Open live map indoors (no GPS) → join succeeds, no bogus pose; first outdoor fix triggers visibility.
7. On AWS/CloudFront: same checks; hub URL must be same-origin or correct API host (not `localhost` on a phone).

### AWS note

CloudFront → ALB → single ECS task is supported without a Redis backplane. If flakes persist, verify ALB idle timeout (default 60s) and that WebSockets to `/hubs/ride-live` stay open in DevTools.
