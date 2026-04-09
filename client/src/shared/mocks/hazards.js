// client/src/shared/mocks/hazards.js
export const MOCK_HAZARDS = [
    {
        id: 1,
        type: 'pothole',
        description: 'Large pothole on main road',
        latitude: 31.7683,
        longitude: 35.2137,
        reportedBy: 1,
        reportedAt: '2024-03-15T14:30:00Z',
        status: 'active',
    },
    {
        id: 2,
        type: 'construction',
        description: 'Road construction blocking path',
        latitude: 32.0853,
        longitude: 34.7818,
        reportedBy: 2,
        reportedAt: '2024-03-16T09:15:00Z',
        status: 'active',
    },
];
