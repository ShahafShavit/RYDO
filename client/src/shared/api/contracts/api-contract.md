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
Response (counts are platform-wide):
```json
{
  "totalRoutes": 0,
  "totalRides": 0,
  "totalUsers": 0
}
```

The home dashboard UI also composes **`GET /history`**, **`GET /rides/groups`**, and **`GET /challenges`** client-side (see shapes below).

## History
### `GET /history`
Returns a JSON array of completed rides for the authenticated user, newest first. Each item includes:
```json
{
  "id": 1,
  "routeId": 1,
  "routeTitle": "Oak Ridge Loop",
  "routeDifficulty": "moderate",
  "completedAt": "2026-04-10T12:00:00.000Z",
  "durationMinutes": 90,
  "distanceKm": 22.5,
  "elevationGainM": 120
}
```
`routeDifficulty` mirrors the linked route’s difficulty when the route exists; otherwise it may be omitted or null.

## Rides (group events)
### `GET /rides/groups`
Returns a JSON array. Each item includes `routeTitle` (from the linked route) for display:
```json
{
  "id": 1,
  "name": "Weekend Warriors",
  "description": "Saturday social pace",
  "scheduledDate": "2026-06-15T08:00:00.000Z",
  "routeId": 1,
  "routeTitle": "Mountain Peak Trail",
  "participants": [1, 2],
  "maxParticipants": 10
}
```

### `GET /rides/events/:rideId`
Same fields as a single element from `GET /rides/groups`, including `routeTitle`.

## Secondary Feature Endpoints
These feature modules exist and use the shared client path, even if not all pages are currently mounted:

- `GET /dashboard/summary`
- `GET /hazards`
- `POST /hazards`
- `GET /rides/groups`
- `POST /rides/groups`
- `GET /rides/events/:rideId`
- `GET /chat/:rideId`
- `POST /chat/:rideId`
- `GET /history`
- `GET /challenges`
