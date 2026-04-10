# Validation Expectations

This file documents the validation assumptions implied by the current frontend code. It is guidance for backend integration, not a generated schema.

## General
- strings are trimmed where the frontend prepares payloads
- IDs are expected to be numeric or coercible to numeric values
- dates are handled as ISO 8601 strings
- coordinates use WGS84 latitude/longitude

## Authentication
- `email` is required
- `password` is required and must be at least 6 characters
- `firstName` is required and must be at least 2 characters
- `lastName` is required and must be at least 2 characters

## Routes
- `title` is required
- `terrain` is required and should normalize to `road | gravel | trail | mixed`
- `difficulty` is required and should normalize to `casual | moderate | hard`
- `estimatedDurationMinutes` is required
- route lists are queried with `skip` and `take`

## GPX Upload
- file field must be `gpxFile`
- accepted extension is `.gpx`
- invalid files should return structured validation errors
- the frontend can preview route distance and elevation locally, but backend-derived values should win

## Hazards
- report payloads currently send:
  - `type`
  - `severity`
  - `description`
  - `latitude`
  - `longitude`
- severity should normalize to `low | medium | high`

## Account
- change password uses:
  - `currentPassword`
  - `newPassword`
- preferences use:
  - `defaultBikeType`
  - `distanceUnit`
  - `notificationsEnabled`

## Error Shape
The frontend is prepared to parse JSON problem details:

```json
{
  "type": "validation_error",
  "title": "Validation failed",
  "status": 400,
  "detail": "One or more fields are invalid.",
  "errors": {
    "title": ["Title is required"]
  }
}
```
