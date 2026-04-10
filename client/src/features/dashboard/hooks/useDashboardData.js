import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/features/dashboard/api/dashboard-api';

const HOME_CONTENT = {
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
};

export function useDashboardData() {
  const summaryQuery = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: dashboardApi.getSummary,
  });

  const summary = summaryQuery.data || {};

  return {
    greeting: 'Everything you need for your next ride is in one place.',
    stats: [
      { label: 'Routes', value: String(summary.totalRoutes ?? '0') },
      { label: 'Group rides', value: String(summary.totalRides ?? '0') },
      { label: 'Users', value: String(summary.totalUsers ?? '0') },
    ],
    home: HOME_CONTENT,
    isLoading: summaryQuery.isLoading,
    isError: summaryQuery.isError,
    error: summaryQuery.error,
  };
}
