# RYDO Client

## Overview
RYDO is a React + Vite frontend for a cycling platform centered on GPX-based routes. The application includes:

- public landing and authentication flows
- route exploration, route details, and personal route libraries
- account settings and preferences
- admin dashboards for users, routes, and hazards
- feature modules for hazards, chat, rides, history, challenges, and dashboard summary data

The frontend uses a feature-based structure and normalizes backend DTOs once per domain before they reach components.

## Architecture
### Top-level structure
- `src/app/`: app bootstrap, providers, router, layouts, global styles
- `src/pages/`: route-level composition files
- `src/features/`: domain modules with APIs, hooks, mappers, and UI
- `src/shared/`: API transport, config, shared UI, mocks, utilities, constants

### Core rules
- Endpoint definitions live in [`src/shared/api/api-endpoints.js`](/Applications/לימודים/רופין/שנה ג׳/פרוייקט גמר/RYDO/client/src/shared/api/api-endpoints.js)
- Transport behavior lives in [`src/shared/api/api-client.js`](/Applications/לימודים/רופין/שנה ג׳/פרוייקט גמר/RYDO/client/src/shared/api/api-client.js)
- DTO normalization happens in feature mappers such as:
  - [`src/features/auth/auth-mapper.js`](/Applications/לימודים/רופין/שנה ג׳/פרוייקט גמר/RYDO/client/src/features/auth/auth-mapper.js)
  - [`src/features/routes/route-mapper.js`](/Applications/לימודים/רופין/שנה ג׳/פרוייקט גמר/RYDO/client/src/features/routes/route-mapper.js)
  - [`src/features/admin/admin-mapper.js`](/Applications/לימודים/רופין/שנה ג׳/פרוייקט גמר/RYDO/client/src/features/admin/admin-mapper.js)
  - [`src/features/hazards/hazard-mapper.js`](/Applications/לימודים/רופין/שנה ג׳/פרוייקט גמר/RYDO/client/src/features/hazards/hazard-mapper.js)
- Components should consume normalized frontend models, not raw backend field aliases

### Providers
- TanStack Query is configured in [`src/app/providers/AppProviders.jsx`](/Applications/לימודים/רופין/שנה ג׳/פרוייקט גמר/RYDO/client/src/app/providers/AppProviders.jsx)
- Authentication state is owned by [`src/features/auth/context/AuthContext.jsx`](/Applications/לימודים/רופין/שנה ג׳/פרוייקט גמר/RYDO/client/src/features/auth/context/AuthContext.jsx)

## Current Routing
### Public routes
- `/`
- `/login`
- `/register`

### Protected user routes
- `/dashboard`
- `/routes`
- `/routes/:routeId`
- `/your-routes`
- `/settings`

### Admin routes
- `/admin`
- `/admin/users`
- `/admin/routes`
- `/admin/hazards`

### Important note
Some feature modules exist without being mounted in the main router yet, including chat, hazards reporting, rides, history, and challenges pages. Their APIs and hooks are implemented, but they are not currently reachable through the routed app shell.

## Data Models
Detailed canonical models live in [`src/shared/api/contracts/models.md`](/Applications/לימודים/רופין/שנה ג׳/פרוייקט גמר/RYDO/client/src/shared/api/contracts/models.md).

### User
- normalized to `{ id, fullName, email, role, isActive, createdAt }`
- auth responses use nested `{ token, user }`
- `fullName` is composed from `firstName` and `lastName` when necessary

### Route
- normalized to:
  - `id`
  - `title`
  - `description`
  - `terrain`
  - `difficulty`
  - `region`
  - `distanceKm`
  - `elevationGainM`
  - `estimatedDurationMinutes`
  - `warnings`
  - `notes`
  - `gpx`
  - `preview`
  - `createdBy`
  - `createdAt`
  - `isSaved`
  - `status`
- current difficulty vocabulary is `casual | moderate | hard`
- current terrain vocabulary is `road | gravel | trail | mixed`

### Hazard
- normalized to `{ id, type, severity, description, status, location, reportedAt, reportedBy }`

### Admin DTOs
- user rows extend normalized users with `status`, `routeCount`, `rideCount`
- route rows extend normalized routes with `ownerName`
- hazard rows reuse normalized hazard shapes

## API Contracts
Canonical contract docs:

- [`src/shared/api/contracts/api-contract.md`](/Applications/לימודים/רופין/שנה ג׳/פרוייקט גמר/RYDO/client/src/shared/api/contracts/api-contract.md)
- [`src/shared/api/contracts/auth.md`](/Applications/לימודים/רופין/שנה ג׳/פרוייקט גמר/RYDO/client/src/shared/api/contracts/auth.md)
- [`src/shared/api/contracts/route-upload.md`](/Applications/לימודים/רופין/שנה ג׳/פרוייקט גמר/RYDO/client/src/shared/api/contracts/route-upload.md)
- [`src/shared/api/contracts/validation.md`](/Applications/לימודים/רופין/שנה ג׳/פרוייקט גמר/RYDO/client/src/shared/api/contracts/validation.md)

### Auth
- `POST /auth/login`
  - body: `{ email, password }`
  - response: `{ token, user }`
- `POST /auth/register`
  - body: `{ firstName, lastName, email, password }`
  - response: `{ token, user }`

### Routes
- `GET /routes?skip&take`
- `GET /routes/:routeId`
- `POST /routes/upload`
- `GET /routes/my?skip&take`
- `GET /routes/saved?skip&take`
- `POST /routes/:routeId/save`
- `DELETE /routes/:routeId/save`

List hooks normalize paginated responses to `{ items, total, skip, take }`, but they also tolerate raw arrays from mock or incomplete backends through the shared pagination helper.

### Admin
- `GET /admin/users?skip&take`
- `DELETE /admin/users/:userId`
- `GET /admin/routes?skip&take`
- `DELETE /admin/routes/:routeId`
- `PATCH /admin/routes/:routeId/moderation`
- `GET /admin/hazards?skip&take`
- `PATCH /admin/hazards/:hazardId/status`

### Account
- `GET /account/profile`
- `PUT /account/profile`
- `GET /account/preferences`
- `PUT /account/preferences`
- `PUT /account/password`

## Features
### Fully integrated through the main routed app
- auth
- routes
- account
- admin

### Implemented on the shared API path but not fully routed
- dashboard summary
- hazards list and report flow
- chat history and send flow
- ride groups and ride details
- ride history
- challenges

## Development Modes
Environment behavior is defined in [`src/shared/config/env.js`](/Applications/לימודים/רופין/שנה ג׳/פרוייקט גמר/RYDO/client/src/shared/config/env.js).

### Real API mode
- `VITE_API_MODE=real`
- uses `VITE_API_BASE_URL`
- requests go through `fetch`
- `401` responses trigger the auth unauthorized handler

### Mock API mode
- `VITE_API_MODE=mock`
- requests are served by [`src/shared/api/mock-client.js`](/Applications/לימודים/רופין/שנה ג׳/פרוייקט גמר/RYDO/client/src/shared/api/mock-client.js)
- mock auth still returns nested `{ token, user }`
- mock list endpoints follow the same envelope expectations where applicable

### Dev auth bypass
- enabled only when:
  - `import.meta.env.DEV`
  - `VITE_API_MODE=mock`
  - `VITE_DEV_AUTH_ENABLED=true`
- role is controlled by `VITE_DEV_ROLE=user|admin`

## GPX Upload Flow
The upload contract is defined in [`src/shared/api/contracts/route-upload.md`](/Applications/לימודים/רופין/שנה ג׳/פרוייקט גמר/RYDO/client/src/shared/api/contracts/route-upload.md).

Current frontend behavior:
- the user selects a `.gpx` file
- the client parses GPX locally for preview, distance, and elevation summary
- the upload request sends:
  - `gpxFile`
  - `title`
  - `description`
  - `terrain`
  - `difficulty`
  - `estimatedDurationMinutes`
  - `region`
  - `warnings`
- the backend is treated as authoritative for persisted route metrics and preview data

## Error Handling
- transport errors are normalized through [`src/shared/api/api-errors.js`](/Applications/לימודים/רופין/שנה ג׳/פרוייקט גמר/RYDO/client/src/shared/api/api-errors.js)
- non-OK responses should return JSON problem details
- raw text errors are still handled as a fallback

## Setup & Running the Project
### Install
```bash
cd client
npm install
```

### Development
```bash
npm run dev
```

### Production build
```bash
npm run build
```

### Lint
```bash
npm run lint
```

### Recommended environment variables
```bash
VITE_API_MODE=mock
VITE_API_BASE_URL=http://localhost:5000
VITE_DEV_AUTH_ENABLED=true
VITE_DEV_ROLE=admin
```

For real backend integration:
```bash
VITE_API_MODE=real
VITE_API_BASE_URL=https://your-api-host
VITE_DEV_AUTH_ENABLED=false
```
