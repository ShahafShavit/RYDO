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
| `DR_DISPLAY_EMA_ALPHA` | Per-frame exponential smoothing of **display** position toward `syn*` (puck, follow camera, hub `offerPose`). Lower = silkier motion, more lag. |
| `HEADING_DISPLAY_SMOOTH` | Shortest-path turn per frame toward `extrapolateHeadingDeg` (device heading / course), stored as `displayHeadingDeg` — avoids avatar rotation snapping between GPS updates. |
| `MIN_MAP_MOTION_SPEED_MPS` / `MIN_MAP_MOTION_SPEED_EXIT_MPS` | Below ~2 km/h (with ~15% hysteresis to exit), the puck, follow camera, and hub `offerPose` use a **frozen snapshot** so GPS noise does not jitter the UI or peers while stationary. `watchPosition` keeps polling. |

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

Peer positions on the map come from `/hubs/ride-live` (`useRideLiveHub.js`), not from distance filtering. After a network drop, the client must call `JoinRide` again on the **new** connection; the status chip reflects the **transport state machine** (`rideLiveConnectivity.js`).

Three orthogonal server-side concepts (see `RideLiveRiderSession.cs` / `RideLivePoseStore.cs`):

| Machine | States | Role |
|---------|--------|------|
| **Transport** (client) | `connecting` → `syncing` → `joined` (+ `reconnecting`, `offline`, `error`) | When the client may invoke `UpdatePose` |
| **Presence** (server) | `present` → `grace` (45s) → absent | Hub disconnect; keeps avatar until `RiderLeft` |
| **Liveness** (server) | `live` → `stale` (10s without pose) | GPS/silent dropout while WebSocket may stay up |

Shared timing (`RideLiveTiming.cs` / `rideLiveTiming.js`): **2s** pose heartbeat, **10s** stale, **45s** disconnect grace.

### Join and first visibility

`JoinRide` accepts an optional initial pose: `(rideId, lat?, lng?, headingDeg?, accuracyM?, atUtc?)`.

- While transport is not `joined`, GPS fixes are **buffered** by the pose publisher (even when `UpdatePose` cannot invoke yet).
- On `JoinRide`, the client passes the buffered pose when lat/lng are valid. The server stores it and broadcasts `RiderMoved` to the group immediately (no rate limit on join).
- Post-join poses are sent at most every **2 seconds** (client publisher + server rate limit; same interval).
- On reconnect within the ~45s disconnect grace, if no new GPS is available the server re-broadcasts the stored pose so peers refresh without waiting for the next `UpdatePose`.

Expect a new joiner to appear on other devices within ~1–2s of their first GPS fix.

| Transport state | Meaning |
|-----------------|---------|
| Connecting… / Syncing riders… | Socket up; joining the ride group |
| Reconnecting… | Automatic reconnect in progress (peer snapshot may be outdated) |
| Live (`joined`) | Joined; receiving `RiderMoved` |
| Disconnected / Connection failed | Use **Retry** or leave and re-enter the live map |

Brief disconnects (tab close, network drop) mark the rider **stale immediately** (`isStale: true`, last lat/lng) and keep them on the map for ~45s (server grace) before `RiderLeft` fires. The 10s pose-stale timer is cancelled on disconnect; grace handles removal instead.

### Stale riders (no GPS / silent dropout)

If a joined rider stops sending `UpdatePose` for **10 seconds** (server-side, `RideLiveTiming.PoseStaleSeconds`), the server marks their pose `isStale: true` and broadcasts `RiderMoved` with the last lat/lng. Standing still does **not** trigger stale: frozen-position heartbeats still invoke `UpdatePose` every ~2s.

| State | Map | Nearby panel (expanded) |
|-------|-----|-------------------------|
| Active (`isStale: false`) | Normal peer avatar | Ahead / behind / nearest as today |
| Stale (`isStale: true`) | Grayscale + 50% opacity | **Connection lost** list: muted name, distance, red **X** |
| Left (`RiderLeft` after ~45s disconnect grace) | Removed | Removed |

- Stale peers are **excluded** from ahead/behind cone logic but still count in “N other riders on the map”.
- **Recovery:** one successful `UpdatePose` clears stale immediately (no multi-pose hysteresis).
- Wire payloads (`RidersState`, `RiderMoved`) include `isStale` via `RideLiveWire.Pose`.

**Manual test (stale):**

1. A and B on live map; B sees A moving.
2. A backgrounds app or stops GPS for **>10s** → B: A’s marker grays out; **Connection lost** shows A (red X + distance).
3. A returns to foreground with GPS → after ~2s (next heartbeat), A’s marker normal; A leaves **Connection lost**.
4. A closes tab → B sees A **stale immediately** (grayscale); after ~45s, `RiderLeft` removes A.
5. A airplane mode until hub drops → same as tab close: immediate stale, then `RiderLeft` after grace.

### Debug logging

**Server (CloudWatch):** Production logs **Information** for `[RideLive]` — joins, disconnects, liveness/presence transitions, timer schedule/fire, stale broadcasts, grace/absence, `RiderLeft`. Pose heartbeats and rate-limits stay **Debug** (set `Rydo.Api.Services.RideLive: Debug` in appsettings for deep dives). Pull with:

```bash
scripts/pull-ride-live-logs.sh --today
scripts/pull-ride-live-logs.sh --hours 2 --ride 25 --follow
```

Categories: `state` (presence/liveness), `timer`, `transport`, `hub`, `broadcast`, `skipped`.

**Client (browser):**

- Append `?debugRideLive=1` to the live map URL once (persists via `localStorage`).
- In dev, `[rydo:ride-live]` logs are always on.
- After every `SignalR reconnected`, expect `JoinRide invoke OK` with `hadPendingPose: true/false`.

### Manual test (two devices, same upcoming ride)

1. Device A already live; device B opens live map → B sees A quickly; A sees B within ~1–2s of B’s first GPS fix (bottom panel peer count updates).
2. Both open live map at once → both peer counts rise within a few seconds without refresh.
3. Airplane mode on device A ~10s → A shows **Reconnecting…** then **Syncing…** then **Live**; B should not lose A permanently during the gap.
4. After reconnect, A’s peer count returns within a few seconds.
5. Background tab A ~15s → foreground → auto-retry or **Retry**; if WS stays up, B may see A as **stale** after ~10s without GPS (see stale test above).
6. Open live map indoors (no GPS) → join succeeds, no bogus pose; first outdoor fix triggers visibility.
7. On AWS/CloudFront: same checks; hub URL must be same-origin or correct API host (not `localhost` on a phone).

### AWS note

CloudFront → ALB → single ECS task is supported without a Redis backplane. If flakes persist, verify ALB idle timeout (default 60s) and that WebSockets to `/hubs/ride-live` stay open in DevTools.
