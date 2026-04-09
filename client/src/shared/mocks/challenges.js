// client/src/shared/mocks/challenges.js
export const MOCK_CHALLENGES = [
    {
        id: 1,
        title: 'Spring Climbing Challenge',
        description: 'Climb 1000m elevation in one ride',
        targetValue: 1000,
        currentValue: 750,
        unit: 'meters',
        startDate: '2024-03-01T00:00:00Z',
        endDate: '2024-03-31T23:59:59Z',
        isActive: true,
    },
    {
        id: 2,
        title: 'Distance Master',
        description: 'Ride 500km this month',
        targetValue: 500,
        currentValue: 320,
        unit: 'km',
        startDate: '2024-03-01T00:00:00Z',
        endDate: '2024-03-31T23:59:59Z',
        isActive: true,
    },
];
