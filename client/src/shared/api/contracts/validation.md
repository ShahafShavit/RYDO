# API Validation Rules

## General Rules
- All string fields are trimmed
- Email fields must be valid email format
- Date fields use ISO 8601 format
- Coordinates use WGS84 standard
- IDs are positive integers
- Pagination uses skip/take pattern

## Authentication
- Password: 8-128 characters
- Username: alphanumeric + underscore, 3-50 chars
- Email: standard email validation

## Routes
- Distance: 0.1 - 1000 km
- Elevation: 0 - 10000 m
- Duration: 1 - 1440 minutes (24 hours)
- Title: required, 1-200 chars
- Coordinates: valid GeoJSON LineString

## Hazards
- Type: must be one of allowed values
- Description: required for reports
- Coordinates: must be valid lat/lng

## Challenges
- Target value: positive number
- Dates: endDate > startDate
- Unit: predefined allowed values

## File Uploads
- GPX files: max 10MB
- Supported formats: .gpx only
- File must contain valid GPS track data

## Rate Limiting
- Auth endpoints: 5 attempts per minute
- File uploads: 10 per hour per user
- General API: 1000 requests per hour per user
