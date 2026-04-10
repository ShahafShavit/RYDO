// client/src/shared/mocks/routes.js
export const MOCK_ROUTES = [
    {
        id: 1,
        title: 'Mountain Peak Trail',
        description: 'Scenic mountain trail with stunning views',
        distanceKm: 45.5,
        elevationGainM: 1200,
        difficulty: 'hard',
        terrain: 'trail',
        durationMinutes: 270,
        createdBy: 'johncyclist',
        createdAt: '2023-03-01T08:00:00Z',
        coordinates: [[31.7683, 35.2137], [31.7690, 35.2140]],
    },
    {
        id: 2,
        title: 'City Loop Road',
        description: 'Easy urban cycling route perfect for beginners',
        distanceKm: 15.2,
        elevationGainM: 120,
        difficulty: 'casual',
        terrain: 'road',
        durationMinutes: 75,
        createdBy: 'sarahadmin',
        createdAt: '2023-03-05T10:00:00Z',
        coordinates: [[32.0853, 34.7818], [32.0860, 34.7820]],
    },
    {
        id: 3,
        title: 'Coastal Ride',
        description: 'Beautiful coastal route with sea views',
        distanceKm: 30.0,
        elevationGainM: 300,
        difficulty: 'medium',
        terrain: 'mixed',
        durationMinutes: 150,
        createdBy: 'miketrainer',
        createdAt: '2023-03-10T12:00:00Z',
        coordinates: [[32.7940, 34.9896], [32.7950, 34.9900]],
    },
];

export const MOCK_SAVED_ROUTES = [1, 2];
