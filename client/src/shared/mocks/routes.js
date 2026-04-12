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
        estimatedDurationSource: 'gpx_timestamps',
        createdBy: { id: 1, fullName: 'John Doe' },
        createdAt: '2023-03-01T08:00:00Z',
        coordinates: [
            [35.2137, 31.7683],
            [35.214, 31.769],
        ],
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
        estimatedDurationSource: 'estimated_pace',
        createdBy: { id: 2, fullName: 'Sarah Admin' },
        createdAt: '2023-03-05T10:00:00Z',
        coordinates: [
            [34.7818, 32.0853],
            [34.782, 32.086],
        ],
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
        estimatedDurationSource: 'estimated',
        createdBy: { id: 3, fullName: 'Mike Trainer' },
        createdAt: '2023-03-10T12:00:00Z',
        coordinates: [
            [34.9896, 32.794],
            [34.99, 32.795],
        ],
    },
];

export const MOCK_SAVED_ROUTES = [1, 2];
