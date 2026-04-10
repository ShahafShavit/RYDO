# Frontend Models

These are the normalized models the UI should consume after mapper processing.

## Paginated Result
```json
{
  "items": [],
  "total": 0,
  "skip": 0,
  "take": 20
}
```

## User
```json
{
  "id": 1,
  "fullName": "Sarah Admin",
  "email": "sarah@example.com",
  "role": "admin",
  "isActive": true,
  "createdAt": "2026-04-10T09:00:00Z"
}
```

Normalization notes:
- `fullName` is derived from `fullName` or `firstName + lastName`
- unknown roles are normalized to `user`

## Route
```json
{
  "id": 1,
  "title": "Oak Ridge Loop",
  "description": "Fast gravel loop with one steep climb.",
  "terrain": "gravel",
  "difficulty": "moderate",
  "region": "Carmel Ridge",
  "distanceKm": 28.4,
  "elevationGainM": 620,
  "estimatedDurationMinutes": 110,
  "warnings": ["Loose descent after km 18"],
  "notes": "Water stop at km 12",
  "gpx": {
    "fileUrl": null,
    "reference": "routes/oak-ridge-loop.gpx"
  },
  "preview": {
    "geoJson": null,
    "coordinates": []
  },
  "createdBy": {
    "id": 2,
    "fullName": "Sarah Admin"
  },
  "createdAt": "2026-04-10T09:00:00Z",
  "isSaved": false,
  "status": "published"
}
```

Normalization notes:
- canonical route title is `title`
- canonical terrain is `road | gravel | trail | mixed`
- canonical difficulty is `casual | moderate | hard`
- legacy `easy` is normalized to `casual`
- legacy `medium` is normalized to `moderate`
- legacy `soilType` and related aliases are normalized to `terrain`

## Hazard
```json
{
  "id": 10,
  "type": "gate",
  "severity": "medium",
  "description": "Gate locked near the second climb.",
  "status": "active",
  "location": {
    "lat": 31.7683,
    "lng": 35.2137,
    "region": "Jerusalem Hills"
  },
  "reportedAt": "2026-04-10T09:00:00Z",
  "reportedBy": {
    "id": 1,
    "fullName": "John Rider"
  }
}
```

## Account Preferences
```json
{
  "defaultBikeType": "road",
  "distanceUnit": "km",
  "notificationsEnabled": true
}
```

## Admin DTOs
### Admin User Row
- base: normalized `User`
- extra fields:
  - `status`
  - `routeCount`
  - `rideCount`

### Admin Route Row
- base: normalized `Route`
- extra fields:
  - `ownerName`

### Admin Hazard Row
- base: normalized `Hazard`
