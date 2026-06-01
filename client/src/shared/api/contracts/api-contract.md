# API Contract

This document is the canonical API contract for the current frontend implementation.

## Shared Transport Rules
- Auth is bearer-token based.
- The token is stored under `rydo_token` and attached as `Authorization: Bearer <token>`.
- List hooks normalize responses to:

```json
{
  "items": [],
  "total": 0,
  "skip": 0,
  "take": 20
}
```

- The frontend tolerates raw arrays through the shared pagination helper, but new backend endpoints should return the envelope above.
- Non-2xx responses should use JSON problem details:

```json
{
  "type": "validation_error",
  "title": "Validation failed",
  "status": 400,
  "detail": "One or more fields are invalid.",
  "errors": {
    "email": ["Email is required"]
  }
}
```

## Auth
### `POST /auth/login`
Request:
```json
{
  "email": "john@example.com",
  "password": "secret123"
}
```

Response:
```json
{
  "token": "jwt-or-compatible-token",
  "user": {
    "id": 1,
    "firstName": "John",
    "lastName": "Rider",
    "email": "john@example.com",
    "role": "user",
    "isActive": true,
    "createdAt": "2026-04-10T09:00:00Z"
  }
}
```

### `POST /auth/register`
Request:
```json
{
  "firstName": "John",
  "lastName": "Rider",
  "email": "john@example.com",
  "password": "secret123"
}
```

Response:
```json
{
  "token": "jwt-or-compatible-token",
  "user": {
    "id": 1,
    "firstName": "John",
    "lastName": "Rider",
    "email": "john@example.com",
    "role": "user",
    "isActive": true,
    "createdAt": "2026-04-10T09:00:00Z"
  }
}
```

## Routes
### `GET /routes?skip&take`
Response: paginated route list

### `GET /routes/:routeId`
Response: single route object

### `POST /routes/upload`
Content type: `multipart/form-data`
See [`route-upload.md`]

### `GET /routes/my?skip&take`
Response: paginated route list

### `GET /routes/saved?skip&take`
Response: paginated route list

### `POST /routes/:routeId/save`
Response:
```json
{
  "routeId": 1,
  "saved": true
}
```

### `DELETE /routes/:routeId/save`
Response: `204 No Content`

## Admin
### `GET /admin/summary`
Response: `{ totalUsers, totalRoutes, liveHazards, activeQuests, activeModifiers, questCompletionsThisWeek }`

### `GET /admin/users?skip&take&search&role`
Optional `search` matches email, handle, or name. Optional `role` filter: `admin` | `user`.
Response: paginated normalized user rows (includes `routeCount`, `rideCount`).

### `PATCH /admin/users/:userId/role`
Request:
```json
{ "role": "admin" }
```
Cannot change own role or demote the system admin.

### `DELETE /admin/users/:userId`
Response: `204 No Content`

### `GET /admin/routes?skip&take&search&status`
Optional `search` matches route title or owner name. Optional `status` filter.
Response: paginated normalized route rows

### `DELETE /admin/routes/:routeId`
Response: `204 No Content`

### `PATCH /admin/routes/:routeId/moderation`
Request:
```json
{
  "status": "flagged"
}
```

### `GET /admin/hazards?skip&take&status&severity&type`
Optional filters for hazard list.
Response: paginated normalized hazard rows

### `PATCH /admin/hazards/:hazardId/status`
Request:
```json
{
  "status": "resolved"
}
```

### Challenges admin
- `GET /admin/challenges/templates`
- `GET /admin/challenges/instances?skip&take&status`
- `GET /admin/challenges/instances/:id/progress?skip&take`
- `POST /admin/challenges/instances`
- `PATCH /admin/challenges/instances/:id`

## Account
### `GET /account/profile`
Response: normalized user profile

### `PUT /account/profile`
Request:
```json
{
  "firstName": "John",
  "lastName": "Rider",
  "email": "john@example.com"
}
```

The frontend currently normalizes profile responses to the user model and consumes `fullName` after normalization.

### `GET /account/preferences`
Response:
```json
{
  "defaultBikeType": "road",
  "distanceUnit": "km",
  "notificationsEnabled": true,
  "publicInRouteRiderLists": true,
  "colorScheme": "midnight"
}
```

`colorScheme` is one of: `midnight`, `evergreen`, `abyss`, `daylight`, `sage`, `dune`. Invalid values are treated as `midnight`.

### `PUT /account/preferences`
Request and response use the same shape as `GET /account/preferences`. Omit optional fields to leave them unchanged (server-dependent); the client typically sends the full preference object.

### `PUT /account/password`
Request:
```json
{
  "currentPassword": "old-secret",
  "newPassword": "new-secret"
}
```

Response: `204 No Content`

## Dashboard
### `GET /dashboard/summary`
Response (counts are **per authenticated user**):
```json
{
  "completedRides": 0,
  "savedRoutes": 0,
  "groupRidesJoined": 0
}
```

The home dashboard UI also composes **`GET /history`**, **`GET /users/me/rides`**, **`GET /clubs`**, and **`GET /challenges`** client-side (see shapes below).

## History
### `GET /history`
Returns a JSON array of completed rides for the authenticated user, newest first. Each item includes:
```json
{
  "id": 1,
  "routeId": 1,
  "routeTitle": "Oak Ridge Loop",
  "routeDifficulty": "moderate",
  "estimatedDurationMinutes": 120,
  "completedAt": "2026-04-10T12:00:00.000Z",
  "durationMinutes": 90,
  "distanceKm": 22.5,
  "elevationGainM": 120,
  "rideId": 1,
  "rideKind": "personal",
  "clubId": null,
  "clubName": null
}
```
`routeDifficulty` and `estimatedDurationMinutes` mirror the linked route when the route exists; otherwise they may be omitted or null.

Every completion has a **`rideId`** (the ride screen at `GET /rides/:rideId`). **`rideKind`** is `"club"` (scheduled club ride), `"personal"` (scheduled personal ride), or `"soloLog"` (solo log / ad-hoc ride). **`clubId`** / **`clubName`** are set when the underlying ride belongs to a club.

Schema changes require recreating the local Docker database volume (see project README / `docker compose down -v`).

## Rides (scheduled rides — club or personal)

### `GET /users/me/rides` (authenticated)
Query parameters (optional):

- `q` — case-sensitive substring match on ride name, route title, and club name (server may use provider-specific case rules).
- `when` — `upcoming` (scheduled date in the future), `past` (before now), or `all` (default). For `upcoming`, results are ordered soonest first and **capped at 4** rides; for `past`, most recent first; for `all`, most recent scheduled date first.

Returns a JSON array of rides where the current user is a participant. Each item uses the **ride JSON shape** below (with roster visibility rules applied).

### `POST /users/me/rides` (authenticated)
Creates a **personal** scheduled ride (no club). Body:
```json
{
  "name": "Morning solo loop",
  "description": "",
  "scheduledDate": "2026-07-01T06:30:00.000Z",
  "routeId": 3,
  "maxParticipants": 20
}
```
The creator is added as a participant. Response uses the **ride JSON shape** with roster visible (`clubId` and `clubName` are null).

### `GET /rides/:rideId` (anonymous or authenticated)
Returns one scheduled ride. **Roster privacy:** active members of the ride’s club receive `participants`, `participantDetails`, and `participantCount`. Anonymous users and authenticated users who are **not** active members of that club receive **`participantCount` only** (no `participants` / `participantDetails`).

If the ride belongs to a **private** club and the viewer is **not** an active member of that club, the API returns **`404 Not Found`** (no ride details), so deep links cannot bypass club privacy.

**Ride JSON shape** (when roster is visible):
```json
{
  "id": 1,
  "rideKind": "scheduled",
  "name": "Weekend Warriors",
  "description": "Saturday social pace",
  "scheduledDate": "2026-06-15T08:00:00.000Z",
  "routeId": 1,
  "routeTitle": "Mountain Peak Trail",
  "routePreview": { "coordinates": [[34.8, 32.1], [34.81, 32.11]] },
  "participantCount": 2,
  "participants": [1, 2],
  "participantDetails": [
    { "userId": 1, "displayName": "John Rider" }
  ],
  "maxParticipants": 10,
  "clubId": 1,
  "clubName": "Coastal Open Rollers",
  "clubAvatarUrl": "https://example.com/club-avatar.png",
  "createdBy": { "id": 2, "fullName": "Jane Smith", "avatarUrl": "https://example.com/avatar.png" },
  "viewerCanEdit": false
}
```

`routePreview` is omitted or null when the ride has no route or no stored polyline; when present, `coordinates` are `[longitude, latitude]` pairs (same as history `preview`) for map thumbnails.

`clubAvatarUrl` is the club’s profile image URL when the ride is linked to a club and the club has an avatar; otherwise null (same trimming rules as club list `avatarUrl`).

`createdBy` identifies the user who scheduled the ride (`id`, display `fullName`, and optional `avatarUrl` using the same roster rules as ride participant rows).

`viewerCanEdit` is `true` when the authenticated viewer may edit this ride: the ride is still within its **48-hour event window** (from scheduled start), and the viewer is either the ride creator (personal or club ride), or an **active club admin** for a club-linked ride. Anonymous requests receive `viewerCanEdit: false`.

Scheduled rides include **`rideEventWindow`** (null for `soloLog`):

```json
"rideEventWindow": {
  "closesAt": "2026-06-17T08:00:00.000Z",
  "hasStarted": false,
  "liveAvailable": true,
  "chatReadOnly": false,
  "canEditScheduledDate": true
}
```

- **`closesAt`**: `scheduledDate + 48 hours` (UTC).
- **`liveAvailable`**: scheduled ride with a linked route, still within the window.
- **`chatReadOnly`**: `true` after the window closes (chat history remains readable).
- **`canEditScheduledDate`**: `false` once `hasStarted` is `true`.

When roster is hidden, `participantDetails` and `participants` are omitted or null; `participantCount` is always present.

### `POST /clubs/:clubId/rides` (authenticated)
Creates a scheduled ride for that club. The caller must be an **active** club member. Creator is added as a participant. Body (no `clubId` — it comes from the URL):
```json
{
  "name": "Morning roll",
  "description": "",
  "scheduledDate": "2026-07-01T06:30:00.000Z",
  "routeId": 3,
  "maxParticipants": 20,
  "scheduleForWholeClub": false
}
```
If `scheduleForWholeClub` is `true`, the caller must be a **club admin**; the server adds **active** club members as ride participants up to `maxParticipants` (after adding the creator). That bulk-invite behavior applies at **create** time only; updating a ride does not re-invite the whole club.

### `PATCH /rides/:rideId` (authenticated)
Updates a scheduled ride while the **48-hour event window** is open. The caller must be allowed to edit (`viewerCanEdit` would be `true` for them on `GET`). After the window closes → `403 Forbidden`. **`scheduledDate` cannot be changed after the ride has started** (`400` with problem details). Body (same fields as create, without `scheduleForWholeClub`):

```json
{
  "name": "Morning roll (updated)",
  "description": "",
  "scheduledDate": "2026-07-01T07:00:00.000Z",
  "routeId": 3,
  "maxParticipants": 20
}
```

`routeId` may be `null` to clear the linked route. `maxParticipants` must be **greater than or equal to** the current number of participants; otherwise `400` with problem details. Unknown `routeId` → `404`. Response is the **ride JSON shape** (including `viewerCanEdit: true` for the editor).

### Ride chat (participants only)

All endpoints require authentication. Caller must be on the ride roster (`403` otherwise). Not available for `soloLog` rides.

#### `GET /rides/:rideId/chat/messages?beforeMessageId=&fromMessageId=&take=`
Returns:

```json
{
  "messages": [
    {
      "id": 1,
      "rideId": 5,
      "authorUserId": 2,
      "authorHandle": "jane",
      "authorDisplayName": "Jane Smith",
      "authorAvatarUrl": null,
      "body": "Meet at the café",
      "sentAt": "2026-06-15T07:45:00.000Z"
    }
  ],
  "readOnly": false,
  "closesAt": "2026-06-17T08:00:00.000Z"
}
```

Pagination matches club chat (`beforeMessageId` / `fromMessageId` / `take`). After `closesAt`, `readOnly` is `true` and `POST` is rejected.

#### `POST /rides/:rideId/chat/messages`
Body: `{ "body": "string" }`. Returns the new message object. `403` when read-only.

#### `POST /rides/:rideId/chat/read`
Body: `{ "lastReadMessageId": 1 }` or `{ "markLatest": true }`. Returns `204`.

SignalR hub: `/hubs/ride-chat` — `JoinRide(rideId)` → `ReceiveMessage` events (same message shape as HTTP).

### `GET /users/me/ride-chat/summary` (authenticated)
Array of ride chat conversations for the Chat tab. One row per non–solo-log ride the user has joined (including rides with no messages yet).

Each item: `{ rideId, rideName, clubId, clubName, unreadCount, lastMessagePreview, lastMessageAt, scheduledDate, readOnly }`.

- `lastMessagePreview` — truncated server-side (120 chars); null if no messages.
- `lastMessageAt` — ISO UTC of latest message, or null.
- `readOnly` — `true` when ride chat is outside the 48h writable window (`RideEventWindow`).
- Sorted by latest message time descending; rides without messages sort by `ScheduledDate`.

### `POST /rides/:rideId/join` / `POST /rides/:rideId/leave` (authenticated)
Join or leave the ride roster. Join requires an **active** membership in the ride’s club when the ride is linked to a club (`leave` returns `204 No Content`).

## Cycling clubs
Visibility is `public` or `private` in JSON responses; create/patch use numeric enum **`0` = public, `1` = private** (`ClubVisibility`).

Ride creation policy is `everyone` | `organizersAndAdmins` | `adminsOnly` in JSON responses; patch uses numeric enum **`0` = everyone, `1` = organizersAndAdmins, `2` = adminsOnly** (`ClubRideCreationPolicy`). Default is **everyone**.

Member `role` in roster responses: `member` | `organizer` | `admin`. Viewer membership strings (`myRole`, `currentUserMembership`) also include `organizer`.

`viewerCanCreateRide` is computed server-side from the club policy and the viewer’s active membership role.

### `GET /clubs`
- Anonymous: public clubs only.
- Authenticated: **all** public and **all** private clubs (for discovery). Each row includes `membershipPending`, `myRole` (`member` | `organizer` | `admin` | `pending` | null), `rideCreationPolicy`, `viewerCanCreateRide`, `upcomingRideCount` (scheduled club rides from now), and `memberCount` (active members, or null when redacted). For **private** clubs, if the viewer is **not** an active member, `description`, `region`, `memberCount`, and `avatarUrl` are omitted (null), matching `GET /clubs/:id`.
- Each row includes optional `avatarUrl` when not redacted (image URL string or null).

### `POST /clubs` (authenticated)
Body: `{ "name", "description", "region", "visibility": 0|1 }`. Creator becomes an **active admin** member. Response includes `avatarUrl` (typically `null` for new clubs).

### `GET /clubs/:id`
Returns `visibility`, `memberCount`, `rideCreationPolicy`, `viewerCanCreateRide`, and `currentUserMembership`: `none` | `pending` | `member` | `organizer` | `admin`.

For **private** clubs, if the viewer is **not** an active member (`pending` or `none`), `description`, `region`, `memberCount`, and `avatarUrl` are omitted (null). The club **name** remains so people know which club they are requesting to join.

### `GET /clubs/:id/members` (authenticated, active members only)
Member roster with `userId`, `displayName`, `email`, `role`, `membershipStatus` (`active` | `pending`), and timestamps. **Regular members** receive **active** members only. **Club admins** also receive **pending** join requests in the same list (sorted with pending first), so the UI can show approve/deny alongside the roster.

### `POST /clubs/:id/join` / `POST /clubs/:id/leave` (authenticated)
Public clubs: immediate **active** membership. Private clubs: **pending** until approved. Leave blocked for sole admin (HTTP 400 with problem details).

### `GET /clubs/:id/join-requests` (club admins)
Pending membership requests.

### `POST /clubs/:id/join-requests/:userId/approve` | `.../reject` (club admins)

### `POST /clubs/:id/invites` (club admins)
Returns `{ "inviteCode": "<token>", "clubId": n }`.

### `POST /clubs/invites/redeem` (authenticated)
Body: `{ "token": "<code>" }` — grants **active** membership when valid.

### `PATCH /clubs/:id` (club admins)
Update metadata including `visibility` and optional `rideCreationPolicy` (`0|1|2`). Optional `avatarUrl`: set to a non-empty string for an image URL, or clear the image by sending an empty string (stored as null). Omitted properties are left unchanged.

### `POST /clubs/:id/members/:userId/promote` | `.../demote` (club admins)
Promote sets role to **admin** (from member or organizer). Demote sets **admin** → **member**; rejected if it would remove the last admin.

### `POST /clubs/:id/members/:userId/promote-organizer` | `.../demote-organizer` (club admins)
Promote-organizer sets **member** → **organizer**. Demote-organizer sets **organizer** → **member**.

### `POST /clubs/:clubId/rides` (authenticated)
Caller must be an **active** member allowed by the club’s `rideCreationPolicy` (otherwise `403`). Active members under **everyone**; **organizer** or **admin** under **organizersAndAdmins**; **admin** only under **adminsOnly**.

### `DELETE /clubs/:id/members/:userId` (club admins)
Cannot remove the last admin.

### `GET /clubs/:id/rides`
- **Public** club: array of scheduled ride rows. Same **roster privacy** as `GET /rides/:rideId`: active club members see full participant lists; others see `participantCount` only (names/times/routes still visible).
- **Private** club, viewer **not** an active member: `{ "summaryOnly": true, "upcomingCount": n, "pastCount": n }` — no ride titles, times, or routes.

## Friends, inbox, and ride invites

### `GET /users/me/inbox/summary` (authenticated)
Returns `{ "unreadCount", "friendUnread", "rideUnread", "clubUnread" }` — unread = not read and not resolved.

### `GET /users/me/inbox?tab=friends|rides|club` (authenticated)
Optional `tab` filters rows: **friends** (`friend_request`), **rides** (`ride_invite`, `club_ride_announced`), **club** (`club_join_request`). Optional `unreadOnly`, `take` (1–100).

Each item includes `id`, `kind`, `createdAt`, `readAt`, `resolvedAt`, and one of:

- `friendRequest`: `{ id, status, fromUser }`
- `clubJoinRequest`: `{ club, requester }`
- `rideInvite`: `{ id, status, fromUser, ride: { id, name, scheduledDate, routeTitle, clubId } }`
- `clubRideAnnounced`: `{ ride, club, createdBy }`

### `POST /users/me/inbox/:inboxItemId/read` (authenticated)
Marks one inbox row read (`204`).

### `POST /rides/:rideId/invites` (authenticated, personal rides only)
Body: `{ "userIds": [1, 2] }`. Caller must be ride creator; each id must be a **friend**, not already on the roster, no duplicate pending invite; total participants + pending invites must stay within `maxParticipants`. Creates `ride_invite` inbox rows. Response: `{ "sent", "inviteIds" }`.

### `POST /rides/:rideId/invites/:inviteId/accept` | `.../decline` (authenticated)
Invitee only. **Accept** adds the user as a participant when the ride is not full and resolves the inbox row. **Decline** resolves the inbox row without joining (user may still `POST /rides/:rideId/join` later if allowed).

### Club ride announcements
On `POST /clubs/:clubId/rides`, after the ride is saved, every **active** club member except the creator receives an informational `club_ride_announced` inbox item (no accept/decline).

## Secondary Feature Endpoints
These feature modules exist and use the shared client path:

- `GET /dashboard/summary`
- `GET /hazards`
- `POST /hazards`
- `GET /users/me/rides` (optional `q`, `when`)
- `POST /users/me/rides`
- `POST /clubs/:clubId/rides`
- `GET /rides/:rideId`
- `PATCH /rides/:rideId`
- `POST /rides/:rideId/join`
- `POST /rides/:rideId/leave`
- `POST /rides/:rideId/invites`, `POST /rides/:rideId/invites/:inviteId/accept`, `POST /rides/:rideId/invites/:inviteId/decline`
- `GET /users/me/inbox`, `GET /users/me/inbox/summary`, `POST /users/me/inbox/:inboxItemId/read`
- `GET /clubs`, `POST /clubs`, club sub-resources as above
- Club group chat (active members only; see `GET /clubs/:id/members` rules):
  - `GET /clubs/:clubId/chat/messages?beforeMessageId=&take=` — paginated history (newest batch uses `beforeMessageId` cursor).
  - `POST /clubs/:clubId/chat/messages` — body `{ "body": string, "mentions": [ { "kind": "user"|"route"|"ride", "id": number } ] }` (server validates each mention).
  - `POST /clubs/:clubId/chat/read` — body `{ "lastReadMessageId": number }` or `{ "markLatest": true }`.
  - `GET /clubs/:clubId/chat/mentionables?q=` — optional `q` filter; returns `{ "users", "routes", "rides" }` for `@` autocomplete.
  - `GET /users/me/club-chat/summary` — array of `{ clubId, clubName, clubAvatarUrl, unreadCount, lastMessagePreview, lastMessageAt }` for the chat tab list (preview is truncated server-side; `clubAvatarUrl` nullable).
- SignalR hub: `/hubs/club-chat` — JWT via `access_token` query or bearer; client joins `JoinClub(clubId)`; server pushes `ReceiveMessage` after each successful `POST` message.
- `GET /history`
- `GET /challenges`
