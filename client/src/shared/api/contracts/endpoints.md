# API Endpoints

## Authentication
- `POST /auth/login` - Login user
  - Body: `{ email: string, password: string }`
  - Response: `{ user: User, token: string }`
- `POST /auth/register` - Register new user
  - Body: `{ username: string, email: string, password: string, firstName: string, lastName: string }`
  - Response: `{ user: User, token: string }`

## Dashboard
- `GET /dashboard/summary` - Get dashboard summary
  - Response: `{ totalRoutes: number, totalRides: number, totalUsers: number }`

## Routes
- `GET /routes` - List routes (paginated)
  - Query: `?skip=number&take=number`
  - Response: `Route[]`
- `GET /routes/{id}` - Get route details
  - Response: `Route`
- `POST /routes/upload` - Upload GPX file
  - Body: FormData with `GpxFile` and metadata
  - Response: `Route`
- `GET /routes/saved` - Get user's saved routes
  - Response: `Route[]`
- `POST /routes/{id}/save` - Save route
  - Response: empty
- `DELETE /routes/{id}/save` - Unsave route
  - Response: empty

## Rides
- `GET /rides/groups` - List ride groups
  - Response: `RideGroup[]`
- `GET /rides/events/{id}` - Get ride details
  - Response: `RideGroup`

## Chat
- `GET /chat/{rideId}` - Get chat messages for ride
  - Response: `ChatMessage[]`
- `POST /chat/{rideId}` - Send message (WebSocket preferred)

## Hazards
- `GET /hazards` - List hazards
  - Response: `Hazard[]`
- `POST /hazards` - Report hazard
  - Body: `{ type: string, description: string, latitude: number, longitude: number }`
  - Response: `Hazard`

## Challenges
- `GET /challenges` - List challenges
  - Response: `Challenge[]`

## History
- `GET /history` - Get user's ride history
  - Response: `HistoryEntry[]`

## Admin
- `GET /admin/users` - List all users
  - Response: `User[]`
- `GET /admin/routes` - List all routes
  - Response: `Route[]`
- `GET /admin/hazards` - List all hazards
  - Response: `Hazard[]`
