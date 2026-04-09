# `client/src` README

This folder contains the React client application for RYDO.

The codebase follows a fairly standard split:

- `app/`: application bootstrapping, providers, router, global styles
- `pages/`: route-level screens
- `features/`: domain-specific UI and logic
- `shared/`: reusable UI, config, API utilities, hooks, helpers, mocks

## What this `src` folder currently is

Based on the scan, this is not a fully finished frontend. It is a mix of:

- real app shell and routing
- real auth/account/routes API wiring
- static/demo dashboard and landing content
- partially implemented admin/rides/navigation/chat/hazards modules
- leftover mock infrastructure from an earlier mock-driven setup

## Important findings from the scan

### 1. Only part of the code is actually routed

The router currently mounts these pages:

- `/`
- `/login`
- `/register`
- `/dashboard`
- `/routes`
- `/routes/:routeId`
- `/your-routes`
- `/settings`
- `/admin`
- `/admin/users`
- `/admin/routes`
- `*` -> not found

Pages that exist in `pages/` but are not currently registered in the router:

- `pages/history`
- `pages/hazards`
- `pages/challenges`
- `pages/chat`
- `pages/rides`
- `pages/admin/AdminHazardsPage.jsx`

### 2. Not every feature is production-ready

Some folders contain real API usage, but many hooks/components still return:

- hardcoded arrays
- placeholder cards
- `null` renderers
- demo text

### 3. Mock infrastructure still exists, but the active API client does not use it

- `shared/api/mock-client.js` is still present
- `shared/mocks/*` is still present
- `shared/config/api-config.js` still describes mock mode
- but `shared/api/api-client.js` currently uses `fetch()` against `env.apiBaseUrl`

So the mock system looks like legacy or backup infrastructure, not the active runtime path.

### 4. `shared/services/` exists but is empty

That folder is currently just an empty placeholder.

---

## Folder-by-folder breakdown

## `app/`

Purpose: app startup, global providers, router definition, and global CSS.

### `app/providers/`

- `AppProviders.jsx`
  Wraps the app with:
  - `QueryClientProvider` from React Query
  - `AuthProvider` from the auth feature

This is the top-level dependency injection layer for app-wide state.

### `app/router/`

- `index.jsx`
  Defines the React Router tree with lazy-loaded pages and layout nesting.
- `route-guards.jsx`
  Contains:
  - `ProtectedRoute` for authenticated users
  - `AdminRoute` for admin-only access
- `route-paths.js`
  Central route constant map for currently declared paths.

This folder is the source of truth for what is actually reachable in the UI.

### `app/styles/`

- `index.css`
  Global visual system:
  - typography imports
  - CSS variables
  - background gradients
  - shared utility classes like `rydo-container`, `rydo-section`, `rydo-glass`

This is where the app-wide look and feel is defined.

---

## `pages/`

Purpose: route-level screens. Most page files are thin composition layers that assemble feature components.

### `pages/admin/`

- `AdminDashboardPage.jsx`
  Admin overview page using `AdminHeader` and `AdminStatsCards`.
- `AdminUsersPage.jsx`
  User management page.
- `AdminRoutesPage.jsx`
  Route moderation page.
- `AdminHazardsPage.jsx`
  Hazard moderation page exists, but is not currently mounted in the router.

This folder is for admin screens, but only dashboard/users/routes are currently reachable.

### `pages/auth/`

- `LoginPage.jsx`
  Hosts the login form.
- `RegisterPage.jsx`
  Hosts the registration form.

Thin public auth pages.

### `pages/challenges/`

- `ChallengesPage.jsx`
  Shows progress ring, achievement list, and challenge cards.

This page exists, but it is not currently routed.

### `pages/chat/`

- `RideChatPage.jsx`
  Chat screen using `ChatThread` and `ChatInput`.

Exists but is not currently routed.

### `pages/dashboard/`

- `DashboardPage.jsx`
  Main authenticated home screen using dashboard feature cards/header.

This is routed and active.

### `pages/hazards/`

- `ReportHazardPage.jsx`
  Hazard reporting screen with report form and hazard list.

Exists but is not currently routed.

### `pages/history/`

- `RideHistoryPage.jsx`
  Ride history overview with summary stats, a placeholder map preview, and ride cards.

Exists but is not currently routed.

### `pages/landing/`

- `LandingPage.jsx`
  Marketing/landing page with:
  - GSAP animation
  - Lenis smooth scrolling
  - feature sections
  - hero video/mockup

This is the public homepage and one of the more visually complete pages in the project.

### `pages/not-found/`

- `NotFoundPage.jsx`
  Generic fallback page for missing routes.

### `pages/rides/`

- `RideGroupsPage.jsx`
  Group rides list plus route upload modal.
- `RideEventPage.jsx`
  Single ride event view.
- `ActiveRidePage.jsx`
  Navigation/live ride screen.

These pages exist, but are not currently wired into the router.

### `pages/routes/`

- `RoutesExplorePage.jsx`
  Lists routes with filters and cards.
- `RouteDetailsPage.jsx`
  Reads `routeId`, loads a route, normalizes GeoJSON, shows map and metadata.
- `YourRoutesPage.jsx`
  Personal routes view with uploaded vs favorite tabs.

This is one of the most developed routed areas.

### `pages/settings/`

- `SettingsPage.jsx`
  Account settings screen with tabbed content:
  - password
  - preferences
  - user data

This is routed and active.

---

## `features/`

Purpose: business/domain modules. Each feature groups API calls, hooks, components, and sometimes schemas or utils.

### `features/account/`

Purpose: authenticated account management.

#### `features/account/api/`

- `account-api.js`
  API wrapper for:
  - password change
  - preferences read/update
  - profile read/update

#### `features/account/hooks/`

- `useAccount.js`
  React Query hooks and cache keys for account operations.

#### `features/account/components/`

- `ChangePasswordForm.jsx`
  Controlled form with validation and mutation call.
- `RidingPreferencesForm.jsx`
  Preferences form backed by account queries/mutations.
- `UserDataDisplay.jsx`
  Read-only user information panel using auth context.

#### `features/account/schemas/`

- `account-schemas.js`
  Validation rules and password form validation helper.

Status: real API-oriented feature, actively used by `SettingsPage`.

### `features/admin/`

Purpose: admin-side moderation and management UI.

#### `features/admin/api/`

- `adminApi.js`
  Despite the name, this file contains both:
  - API calls via React Query hooks
  - admin query keys
  - mutation hooks for delete actions

#### `features/admin/hooks/`

- `useAdminUsers.js`
- `useAdminRoutes.js`
- `useAdminHazards.js`

These only re-export hooks from `adminApi.js`.

#### `features/admin/components/`

- `AdminHeader.jsx`
  Shared page header.
- `AdminStatsCards.jsx`
  Hardcoded overview stats.
- `UsersTable.jsx`
  User list table.
- `RoutesModerationTable.jsx`
  Route moderation list.
- `HazardsModerationTable.jsx`
  Hazard moderation list.
- `AdminSidebar.jsx`
  Currently returns `null`; the real sidebar lives in `shared/components/layout/AdminLayout.jsx`.

#### `features/admin/utils/`

- `admin-formatters.js`
  Placeholder formatter helper.

Status: partially wired. Admin pages are routed, but parts still look scaffolded.

### `features/auth/`

Purpose: authentication state, auth API wrappers, auth forms, local persistence.

#### `features/auth/api/`

- `auth-api.js`
  Simple auth endpoint wrapper.

#### `features/auth/components/`

- `LoginForm.jsx`
- `RegisterForm.jsx`

Controlled forms that call auth context methods and navigate after success.

#### `features/auth/context/`

- `AuthContext.jsx`
  Core auth state manager:
  - reads stored user/token
  - sets auth token into API client
  - supports dev-auth mode through env flags
  - exposes `login`, `register`, `logout`

#### `features/auth/hooks/`

- `useAuth.js`
  Context access helper.

#### `features/auth/schemas/`

- `auth-schemas.js`
  Very lightweight auth validation metadata.

#### `features/auth/utils/`

- `auth-storage.js`
  Local storage helpers for user/token persistence.

Status: real, central, and actively used by guards/layout/forms.

### `features/challenges/`

Purpose: challenge/progress UX.

#### `features/challenges/api/`

- `challenges-api.js`
  API wrapper exists.

#### `features/challenges/hooks/`

- `useChallenges.js`
  Returns hardcoded challenge data.
- `useChallengeProgress.js`
  Returns hardcoded completion percentage.

#### `features/challenges/components/`

- `ChallengeCard.jsx`
- `ProgressRing.jsx`
- `AchievementList.jsx`

#### `features/challenges/utils/`

- `challenge-formatters.js`
  Placeholder formatter.

Status: mostly demo/static right now. Page exists but is not routed.

### `features/chat/`

Purpose: ride chat UI and messaging hooks.

#### `features/chat/api/`

- `chat-api.js`
  Messages endpoint wrapper.

#### `features/chat/hooks/`

- `useChatMessages.js`
  Returns hardcoded chat messages.
- `useSendMessage.js`
  Stub sender that returns success.

#### `features/chat/components/`

- `ChatThread.jsx`
  Renders message list.
- `ChatInput.jsx`
  Message composer UI only.
- `ChatAttachmentButton.jsx`
  Attachment action button.
- `ChatMessage.jsx`
  Currently returns `null`.

#### `features/chat/utils/`

- `chat-formatters.js`
  Small author fallback helper.

Status: scaffolded/demo, not routed.

### `features/dashboard/`

Purpose: authenticated home dashboard.

#### `features/dashboard/api/`

- `dashboard-api.js`
  Summary endpoint wrapper.

#### `features/dashboard/hooks/`

- `useDashboardData.js`
  Returns a large hardcoded dashboard payload:
  stats, last ride, groups, upcoming ride, progress data.

#### `features/dashboard/components/`

- `DashboardHeader.jsx`
  Page heading.
- `DashboardHomeCards.jsx`
  Main dashboard card layout using hardcoded hook data.
- `DashboardStats.jsx`
  Stats card set.
- `DashboardCards.jsx`
  Alternate stat card implementation using auth + saved routes.
- `DashboardSidebar.jsx`
  Placeholder note; real sidebar is in the shared layout.

Status: routed and visually built, but most content is currently static/demo data.

### `features/hazards/`

Purpose: trail hazard reporting and list UI.

#### `features/hazards/api/`

- `hazards-api.js`
  List/create hazard endpoints.

#### `features/hazards/hooks/`

- `useHazardsList.js`
  Returns hardcoded hazards.
- `useReportHazard.js`
  Stub mutation hook.

#### `features/hazards/components/`

- `HazardReportForm.jsx`
  Report form UI.
- `HazardCard.jsx`
  Hazard summary card.
- `HazardStatusBadge.jsx`
  Status badge wrapper.
- `HazardEvidenceUploader.jsx`
  Attachment button UI.

#### `features/hazards/schemas/`

- `hazard-schemas.js`
  Minimal schema metadata.

Status: mostly scaffolded/static, not routed.

### `features/history/`

Purpose: completed ride history.

#### `features/history/api/`

- `history-api.js`
  History endpoint wrapper.

#### `features/history/hooks/`

- `useRideHistory.js`
  Returns hardcoded ride history entries.

#### `features/history/components/`

- `RideHistoryCard.jsx`
  History item card.
- `RideSummaryStats.jsx`
  Hardcoded summary metrics.
- `CompletedRouteMapPreview.jsx`
  Placeholder map preview card.

#### `features/history/utils/`

- `history-formatters.js`
  Placeholder helper.

Status: page exists but feature is mostly static and not routed.

### `features/navigation/`

Purpose: live ride/navigation domain.

#### `features/navigation/api/`

- `navigation-api.js`
  Stub start-session API.

#### `features/navigation/hooks/`

- `useRouteTracking.js`
- `useLiveLocation.js`
- `useOfflineRouteCache.js`
- `useNearbyRiders.js`

All of these currently return simple hardcoded values.

#### `features/navigation/components/`

- `RideMap.jsx`
  Placeholder live map surface card.
- `NavigationControls.jsx`
  Start/center/offline buttons.
- `OfflineMapBanner.jsx`
  Offline-ready status banner.
- `RoutePolyline.jsx`
- `RiderMarkers.jsx`
- `HazardMarkers.jsx`

The last three currently return `null`.

#### `features/navigation/utils/`

- `gps-smoothing.js`
- `route-snapping.js`
- `battery-intervals.js`

Only `battery-intervals.js` contains meaningful logic; the others are passthrough placeholders.

Status: conceptually planned, not finished, not routed.

### `features/rides/`

Purpose: ride groups and ride event management.

#### `features/rides/api/`

- `rides-api.js`
  Ride group list/details endpoint wrapper.

#### `features/rides/hooks/`

- `useRideGroups.js`
  Returns hardcoded ride groups.
- `useRideEvent.js`
  Returns a hardcoded ride record.
- `useCreateRide.js`
  Stub create hook.

#### `features/rides/components/`

- `CreateRideForm.jsx`
  Group ride creation form UI.
- `RideGroupCard.jsx`
  Ride group list card.
- `RideEventCard.jsx`
  Ride event details card.
- `RideMembersList.jsx`
  Member chip list.
- `RideStatusBanner.jsx`
  Live ride status banner.

#### `features/rides/schemas/`

- `ride-schemas.js`
  Minimal schema metadata.

Status: scaffolded and not currently routed.

### `features/routes/`

Purpose: route repository, route details, save/unsave, upload flow.

This is one of the strongest slices in the project.

#### `features/routes/api/`

- `routesApi.js`
  React Query hooks and route cache keys for:
  - list
  - details
  - upload
  - saved routes
  - user routes
  - save/unsave actions

#### `features/routes/hooks/`

- `useRoutesList.js`
- `useRouteDetails.js`
- `useUploadRoute.js`

Thin wrappers around the API hooks.

#### `features/routes/components/`

- `RouteCard.jsx`
  Route preview card.
- `RouteFilters.jsx`
  Filter pill UI; currently visual only.
- `RouteDetailsHeader.jsx`
  Route hero/summary block.
- `RouteMetadataPanel.jsx`
  Route stat panel.
- `SavedRouteButton.jsx`
  Save/unsave action.
- `RouteMapPreview.jsx`
  Leaflet map for route geometry preview.
- `UploadRouteModal.jsx`
  Most complex component in the slice:
  - uploads GPX
  - parses GPX in browser
  - converts to GeoJSON
  - calculates distance/elevation
  - captures metadata
  - submits multipart upload

#### `features/routes/schemas/`

- `route-schemas.js`
  Minimal upload schema metadata.

#### `features/routes/utils/`

- `route-formatters.js`
- `route-difficulty.js`

Small presentation helpers.

#### `features/routes/mocks/`

- `mockRoutes.js`
  Local route example data.

Status: routed, active, and closer to real functionality than most other feature folders.

---

## `shared/`

Purpose: reusable infrastructure and UI.

### `shared/api/`

Purpose: API plumbing, endpoint definitions, and migration docs.

- `api-client.js`
  Active generic fetch wrapper with:
  - auth header injection
  - 401 handling
  - JSON/text response parsing
  - file upload helper
- `api-endpoints.js`
  Central endpoint map for auth, routes, rides, chat, hazards, challenges, history, admin, account.
- `mock-client.js`
  Old in-memory mock backend implementation with route/user/chat/history/etc services.

#### `shared/api/contracts/`

- `entities.md`
  Entity shapes for backend alignment.
- `endpoints.md`
  API contract reference.
- `validation.md`
  Validation expectations.
- `migration.md`
  Notes for moving from mocks to real backend.

This subfolder is the app's transport and contract reference layer.

### `shared/components/`

Purpose: reusable visual building blocks and layouts.

#### `shared/components/feedback/`

- `Loader.jsx`
  Loading indicator.
- `EmptyState.jsx`
  Generic no-data card.
- `ErrorState.jsx`
  Generic error card.

#### `shared/components/layout/`

- `PublicLayout.jsx`
  Public shell with navbar and suspense fallback.
- `DashboardLayout.jsx`
  Main authenticated layout with sidebar, mobile nav, outlet, and route upload modal integration.
- `AdminLayout.jsx`
  Admin layout with separate nav styling.
- `MobileNavbar.jsx`
  Mobile nav variant used by dashboard/admin layouts.

This is where the real app chrome lives.

#### `shared/components/navigation/`

- `AppNavbar.jsx`
  Public top nav.
- `AppLogo.jsx`
  Logo renderer using `/images/Logo-RYDO.png`.
- `UserProfileDropdown.jsx`
  Authenticated profile/settings/logout trigger.

#### `shared/components/ui/`

Reusable primitives:

- `button/Button.jsx`
- `badge/Badge.jsx`
- `card/Card.jsx`
- `input/Input.jsx`
- `textarea/Textarea.jsx`
- `form-field/FormField.jsx`
- `modal/Modal.jsx`
- `badge-nav/BadgeNav.jsx`

These define the shared design language used across the app.

### `shared/config/`

- `env.js`
  Active runtime env reader.
- `navigation.js`
  Public/dashboard/admin nav definitions.
- `api-config.js`
  Old mock-api configuration file still present from earlier setup.

### `shared/constants/`

- `roles.js`
  User/admin role constants.

### `shared/hooks/`

- `useDisclosure.js`
  Generic open/close/toggle hook.
- `useLocalStorage.js`
  State synced to local storage.

### `shared/lib/`

- `cn.js`
  `clsx` + `tailwind-merge` helper for class composition.
- `storage.js`
  Thin localStorage wrappers.

### `shared/mocks/`

In-memory sample datasets for:

- users
- routes
- rides
- chat
- hazards
- challenges
- history

These feed `mock-client.js`.

### `shared/services/`

Currently empty.

Looks like a placeholder for service abstractions that were either removed or merged into `mock-client.js`.

### `shared/utils/`

- `format-date.js`
  Date formatting helper.
- `format-name.js`
  Name capitalization helper.

---

## Fast mental model of the app

If you need to navigate this code quickly, think about it like this:

1. `main.jsx` boots the app.
2. `app/providers/AppProviders.jsx` installs React Query and auth context.
3. `app/router/index.jsx` decides what screens are reachable.
4. `pages/` compose routed screens.
5. `features/` hold domain logic and feature-specific UI.
6. `shared/` holds the reusable infrastructure and design system.

## Where the real implementation effort currently seems concentrated

The most substantial parts of `src` are:

- app shell and routing
- landing page
- auth flow
- account settings
- route browsing/details/save flow
- GPX upload modal
- dashboard/admin layouts

## Where the code is still mostly scaffold/demo

- chat
- challenges
- hazards
- history
- rides
- live navigation
- parts of admin and dashboard data

## Short conclusion

`client/src` is organized well enough structurally, but the implementation depth is uneven.

If you are trying to understand "what is really working" versus "what only exists on paper":

- trust `app/`, `features/auth`, `features/account`, `features/routes`, and the shared layouts first
- treat many other feature folders as UI scaffolds or in-progress slices until proven otherwise
