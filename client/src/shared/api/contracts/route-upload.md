# Route Upload Contract

## Purpose
Route upload is GPX-based. The frontend parses the file locally for preview and estimated stats, then sends the file and canonical metadata to the backend.

## Endpoint
- `POST /routes/upload`
- content type: `multipart/form-data`

## Multipart Fields
- `gpxFile`: required file field
- `title`: required string
- `description`: optional string
- `terrain`: required enum `road | gravel | trail | mixed`
- `difficulty`: required enum `casual | moderate | hard`
- `estimatedDurationMinutes`: required integer
- `region`: optional string
- `warnings`: optional JSON-encoded string array

## What the Frontend Does Before Upload
- reads the `.gpx` file locally
- validates it as XML
- converts it to GeoJSON for preview
- estimates:
  - `distanceKm`
  - `elevationGainM`
- shows metadata inputs before submit

Those client-side estimates are preview-only. They are not sent as authoritative route metrics.

## What the Frontend Sends
Example multipart payload:

- `gpxFile=<binary file>`
- `title=Oak Ridge Loop`
- `description=Fast gravel loop with one steep climb`
- `terrain=gravel`
- `difficulty=moderate`
- `estimatedDurationMinutes=110`
- `region=Carmel Ridge`
- `warnings=["Loose descent after km 18"]`

## Rules
- do not send duplicate `file` fields
- do not send PascalCase keys such as `Name`, `Difficulty`, or `SoilType`
- canonical metadata keys are lowercase camelCase / lowercase field names exactly as listed above
- the backend should derive and persist final:
  - distance
  - elevation
  - preview geometry
  - GPX storage reference

## Expected Response
The response should be a route object compatible with the normalized route model described in [`models.md`]
