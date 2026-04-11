// client/src/shared/mocks/rides.js
export const MOCK_RIDE_GROUPS = [
  {
    id: 1,
    name: 'Weekend Warriors',
    description: 'Group rides every Saturday',
    scheduledDate: '2026-06-15T08:00:00Z',
    routeId: 1,
    routeTitle: 'Mountain Peak Trail',
    participants: [1, 3],
    participantDetails: [
      { userId: 1, displayName: 'Demo User' },
      { userId: 3, displayName: 'Alex Cohen' },
    ],
    maxParticipants: 10,
    clubId: 1,
    clubName: 'Mock Open Club',
  },
  {
    id: 2,
    name: 'City Explorers',
    description: 'Urban cycling exploration',
    scheduledDate: '2026-06-20T10:00:00Z',
    routeId: 2,
    routeTitle: 'City Loop Road',
    participants: [2],
    participantDetails: [{ userId: 2, displayName: 'Jane Rider' }],
    maxParticipants: 8,
    clubId: 1,
    clubName: 'Mock Open Club',
  },
];
