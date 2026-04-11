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
### `GET /admin/users?skip&take`
Response: paginated normalized user rows

### `DELETE /admin/users/:userId`
Response: `204 No Content`

### `GET /admin/routes?skip&take`
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

### `GET /admin/hazards?skip&take`
Response: paginated normalized hazard rows

### `PATCH /admin/hazards/:hazardId/status`
Request:
```json
{
  "status": "resolved"
}
```

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
  "notificationsEnabled": true
}
```

### `PUT /account/preferences`
Request and response use the same shape as `GET /account/preferences`.

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
  "rideGroupId": null,
  "rideKind": null,
  "clubId": null,
  "clubName": null
}
```
`routeDifficulty` and `estimatedDurationMinutes` mirror the linked route when the route exists; otherwise they may be omitted or null.

When this completion is tied to a scheduled group ride (`rideGroupId` set), `rideKind` is `"club"` or `"personal"` (no club), and `clubId` / `clubName` match that ride’s club when it is a club ride.

## Rides (scheduled rides — club or personal)

### `GET /users/me/rides` (authenticated)
Query parameters (optional):

- `q` — case-sensitive substring match on ride name, route title, and club name (server may use provider-specific case rules).
- `when` — `upcoming` (scheduled date in the future), `past` (before now), or `all` (default). For `upcoming`, results are ordered soonest first; for `past`, most recent first; for `all`, most recent scheduled date first.

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

**Ride JSON shape** (when roster is visible):
```json
{
  "id": 1,
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
  "clubName": "Coastal Open Rollers"
}
```

`routePreview` is omitted or null when the ride has no route or no stored polyline; when present, `coordinates` are `[longitude, latitude]` pairs (same as history `preview`) for map thumbnails.

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
If `scheduleForWholeClub` is `true`, the caller must be a **club admin**; the server adds **active** club members as ride participants up to `maxParticipants` (after adding the creator).

### `POST /rides/:rideId/join` / `POST /rides/:rideId/leave` (authenticated)
Join or leave the ride roster. Join requires an **active** membership in the ride’s club when the ride is linked to a club (`leave` returns `204 No Content`).

## Cycling clubs
Visibility is `public` or `private` in JSON responses; create/patch use numeric enum **`0` = public, `1` = private** (`ClubVisibility`).

### `GET /clubs`
- Anonymous: public clubs only.
- Authenticated: public clubs plus private clubs the user belongs to; each row may include `membershipPending` and `myRole` (`member` | `admin` | `pending` | null).

### `POST /clubs` (authenticated)
Body: `{ "name", "description", "region", "visibility": 0|1 }`. Creator becomes an **active admin** member.

### `GET /clubs/:id`
Returns `visibility`, `memberCount`, and `currentUserMembership`: `none` | `pending` | `member` | `admin`.

### `GET /clubs/:id/members` (authenticated, members only)
Member roster with `userId`, `displayName`, `email`, `role`, `membershipStatus`.

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
Update metadata including `visibility`.

### `POST /clubs/:id/members/:userId/promote` | `.../demote` (club admins)
Demote is rejected if it would remove the last admin.

### `DELETE /clubs/:id/members/:userId` (club admins)
Cannot remove the last admin.

### `GET /clubs/:id/rides`
Scheduled `RideGroup` rows for that club. Same **roster privacy** as `GET /rides/:rideId`: active club members see full participant lists; others see `participantCount` only.

## Secondary Feature Endpoints
These feature modules exist and use the shared client path:

- `GET /dashboard/summary`
- `GET /hazards`
- `POST /hazards`
- `GET /users/me/rides` (optional `q`, `when`)
- `POST /users/me/rides`
- `POST /clubs/:clubId/rides`
- `GET /rides/:rideId`
- `POST /rides/:rideId/join`
- `POST /rides/:rideId/leave`
- `GET /clubs`, `POST /clubs`, club sub-resources as above
- `GET /chat/:rideId`
- `POST /chat/:rideId`
- `GET /history`
- `GET /challenges`
