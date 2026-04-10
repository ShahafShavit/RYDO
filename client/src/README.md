# `client/src` Implementation Map

## Overview
This folder contains the actual frontend application code. The structure is feature-based, with shared transport and UI infrastructure.

## Folder Responsibilities
### `app/`
- router configuration
- route guards
- global providers
- global styles

### `pages/`
- route-level composition only
- pages should assemble feature components, not own transport logic

### `features/`
- feature APIs
- React Query hooks
- DTO mappers
- feature components
- small feature-specific schemas and formatters

### `shared/`
- API client and endpoint registry
- environment and config helpers
- reusable UI primitives
- reusable layout/navigation components
- shared mocks and utilities

## Active Sources of Truth
- Endpoints: [`shared/api/api-endpoints.js`]
- Transport: [`shared/api/api-client.js`]
- Auth normalization: [`features/auth/auth-mapper.js`]
- Route normalization: [`features/routes/route-mapper.js`]
- Admin normalization: [`features/admin/admin-mapper.js`]
- Hazard normalization: [`features/hazards/hazard-mapper.js`]

## Routed Screens
### Public
- landing
- login
- register

### Protected
- dashboard
- routes explore
- route details
- your routes
- settings

### Admin
- admin dashboard
- admin users
- admin routes
- admin hazards

## Implemented but Not Mounted in the Main Router
- ride groups / ride event pages
- chat page
- hazards report page
- history page
- challenges page

These modules still use the same shared API path and normalized data model. They are not dead code, but they are not currently reachable from the router.

## Feature Notes
### Auth
- auth state is persisted in local storage
- login/register expect nested auth responses
- dev auth bypass is restricted to mock mode

### Routes
- normalized route fields use `title`, `terrain`, `difficulty`, `estimatedDurationMinutes`
- difficulty is `casual | moderate | hard`
- upload uses multipart `gpxFile`

### Admin
- admin hooks normalize paginated responses
- tables consume normalized rows, not raw React Query objects

### Account
- profile and preferences are served from account hooks
- `UserDataDisplay` falls back to auth state but prefers the profile query

## Documentation Set
Canonical docs live in `shared/api/contracts/`:
- `api-contract.md`
- `models.md`
- `auth.md`
- `route-upload.md`
- `validation.md`
