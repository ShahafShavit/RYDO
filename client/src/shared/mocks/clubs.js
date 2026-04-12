// client/src/shared/mocks/clubs.js
export const MOCK_CLUBS = [
  {
    id: 1,
    name: 'Mock Open Club',
    description: 'Everyone welcome',
    region: 'Tel Aviv',
    visibility: 'public',
    membershipPending: false,
    myRole: 'member',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    name: 'Mock Private Club',
    description: 'Invite only',
    region: 'Haifa',
    visibility: 'private',
    membershipPending: false,
    myRole: 'admin',
    createdAt: '2026-01-15T00:00:00.000Z',
  },
  {
    id: 3,
    name: 'Jerusalem Hills Collective',
    description: 'Private club — request to join or use an invite.',
    region: 'Jerusalem Hills',
    visibility: 'private',
    membershipPending: true,
    myRole: 'member',
    createdAt: '2026-01-20T00:00:00.000Z',
  },
];
