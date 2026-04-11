// client/src/shared/mocks/history.js
export const MOCK_HISTORY = [
    {
        id: 1,
        routeId: 1,
        routeTitle: 'Mountain Peak Trail',
        routeDifficulty: 'hard',
        completedAt: '2024-03-10T12:00:00Z',
        durationMinutes: 280,
        distanceKm: 45.5,
        elevationGainM: 1200,
        preview: {
            coordinates: [
                [35.2137, 31.7683],
                [35.214, 31.769],
            ],
        },
    },
    {
        id: 2,
        routeId: 2,
        routeTitle: 'City Loop Road',
        routeDifficulty: 'casual',
        completedAt: '2024-03-12T11:30:00Z',
        durationMinutes: 80,
        distanceKm: 15.2,
        elevationGainM: 120,
        preview: {
            coordinates: [
                [34.7818, 32.0853],
                [34.782, 32.086],
            ],
        },
    },
];
