import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMatch } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useRideEvent } from '@/features/rides/hooks/useRideEvent';
import { clubChatApi } from '@/features/club-chat/api/club-chat-api';
import { ROUTES } from '@/app/router/route-paths';

/** Total unread club chat messages (respects live-ride scoped club when applicable). */
export function useClubChatUnread() {
  const { user } = useAuth();
  const liveRideMatch = useMatch({ path: ROUTES.rideLive, end: true });
  const liveRideId = liveRideMatch?.params?.rideId;
  const { ride: liveRide } = useRideEvent(liveRideId);

  const liveScopedClubId = useMemo(() => {
    if (!liveRideMatch || liveRide?.clubId == null || liveRide.clubId === '') return null;
    const n = Number(liveRide.clubId);
    return Number.isFinite(n) ? n : null;
  }, [liveRideMatch, liveRide?.clubId]);

  const liveChatScoped = liveScopedClubId != null;

  const summaryQuery = useQuery({
    queryKey: ['clubChat', 'summary'],
    queryFn: () => clubChatApi.getSummary(),
    enabled: !!user?.id,
    staleTime: 15_000,
  });

  const summary = useMemo(() => summaryQuery.data || [], [summaryQuery.data]);

  const totalUnread = useMemo(() => {
    if (liveChatScoped && liveScopedClubId != null) {
      const row = summary.find((s) => s.clubId === liveScopedClubId);
      return row?.unreadCount ?? 0;
    }
    return summary.reduce((a, r) => a + (r.unreadCount || 0), 0);
  }, [summary, liveChatScoped, liveScopedClubId]);

  return { totalUnread, summaryQuery };
}
