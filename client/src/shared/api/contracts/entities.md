# API Entities

## User
- `id`: integer (primary key)
- `username`: string (unique, 3-50 chars)
- `email`: string (unique, valid email)
- `firstName`: string (1-100 chars)
- `lastName`: string (1-100 chars)
- `role`: enum ('user', 'admin')
- `createdAt`: datetime
- `isActive`: boolean

## Route
- `id`: integer (primary key)
- `title`: string (1-200 chars)
- `description`: string (optional, 0-1000 chars)
- `distanceKm`: float (>0)
- `elevationGainM`: integer (>=0)
- `difficulty`: enum ('easy', 'medium', 'hard')
- `terrain`: enum ('road', 'trail', 'mixed')
- `durationMinutes`: integer (>0)
- `createdBy`: string (username)
- `createdAt`: datetime
- `coordinates`: array of [lat, lng] pairs

## SavedRoute
- `userId`: integer (foreign key to User)
- `routeId`: integer (foreign key to Route)
- `savedAt`: datetime

## Challenge
- `id`: integer (primary key)
- `title`: string (1-200 chars)
- `description`: string (0-1000 chars)
- `targetValue`: float (>0)
- `currentValue`: float (>=0)
- `unit`: string (e.g., 'km', 'meters')
- `startDate`: datetime
- `endDate`: datetime
- `isActive`: boolean

## Hazard
- `id`: integer (primary key)
- `type`: enum ('pothole', 'construction', 'traffic', 'other')
- `description`: string (1-500 chars)
- `latitude`: float (-90 to 90)
- `longitude`: float (-180 to 180)
- `reportedBy`: integer (foreign key to User)
- `reportedAt`: datetime
- `status`: enum ('active', 'resolved', 'dismissed')

## RideGroup
- `id`: integer (primary key)
- `name`: string (1-100 chars)
- `description`: string (0-500 chars)
- `scheduledDate`: datetime
- `routeId`: integer (foreign key to Route)
- `participants`: array of user IDs
- `maxParticipants`: integer (>0)

## ChatMessage
- `id`: integer (primary key)
- `rideId`: integer (foreign key to RideGroup)
- `userId`: integer (foreign key to User)
- `username`: string
- `message`: string (1-1000 chars)
- `timestamp`: datetime

## HistoryEntry
- `id`: integer (primary key)
- `userId`: integer (foreign key to User)
- `routeId`: integer (foreign key to Route)
- `routeTitle`: string
- `completedAt`: datetime
- `durationMinutes`: integer (>0)
- `distanceKm`: float (>0)
- `elevationGainM`: integer (>=0)
