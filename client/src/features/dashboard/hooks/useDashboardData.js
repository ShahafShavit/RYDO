export function useDashboardData() {
  return {
    greeting: 'Everything you need for your next ride is in one place.',
    stats: [
      { label: 'Saved routes', value: '18' },
      { label: 'Group rides', value: '04' },
      { label: 'Live hazards', value: '03' },
    ],
    home: {
      awards: {
        title: 'Awards',
        description: 'Trail Champion progress',
        percentage: 78,
      },
      level: {
        title: 'RYDO level',
        currentLevel: 12,
        progress: 62,
        nextLevelLabel: 'Level 13 unlocks new group badges',
      },
      lastRide: {
        title: 'Last RYDO',
        routeName: 'Oak Ridge Loop',
        distance: '22 km',
        duration: '1h 45m',
        difficulty: 'Intermediate',
        mapLabel: 'Trail summary',
      },
      groups: [
        { id: 'group-1', name: 'Sunrise Crew', lastMessage: 'Ready to roll at 07:30?', unread: 2 },
        { id: 'group-2', name: 'Weekend Racers', lastMessage: 'Route set: Valley Sprint', unread: 1 },
        { id: 'group-3', name: 'Forest Riders', lastMessage: 'Check the trail report before we leave.', unread: 0 },
      ],
      upcomingRide: {
        title: 'Upcoming Group RYDO',
        dateTime: 'Sat, Apr 12 · 08:30 AM',
        routeName: 'Canyon Ridge Circuit',
        chatGroup: 'Ridge Runners',
      },
    },
  };
}
