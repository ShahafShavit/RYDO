import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMatch } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useRideEvent } from '@/features/rides/hooks/useRideEvent';
import { clubChatApi } from '@/features/club-chat/api/club-chat-api';
import { rideChatApi } from '@/features/ride-chat/api/ride-chat-api';
import { ROUTES } from '@/app/router/route-paths';

/** Total unread club + ride chat messages (club portion respects live-ride scoped club when applicable). */
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

  const clubSummaryQuery = useQuery({
    queryKey: ['clubChat', 'summary'],
    queryFn: () => clubChatApi.getSummary(),
    enabled: !!user?.id,
    staleTime: 15_000,
  });

  const rideSummaryQuery = useQuery({
    queryKey: ['rideChat', 'summary'],
    queryFn: () => rideChatApi.getSummary(),
    enabled: !!user?.id,
    staleTime: 15_000,
  });

  const clubSummary = useMemo(() => clubSummaryQuery.data || [], [clubSummaryQuery.data]);
  const rideSummary = useMemo(() => rideSummaryQuery.data || [], [rideSummaryQuery.data]);

  const clubUnread = useMemo(() => {
    if (liveChatScoped && liveScopedClubId != null) {
      const row = clubSummary.find((s) => s.clubId === liveScopedClubId);
      return row?.unreadCount ?? 0;
    }
    return clubSummary.reduce((a, r) => a + (r.unreadCount || 0), 0);
  }, [clubSummary, liveChatScoped, liveScopedClubId]);

  const rideUnread = useMemo(
    () => rideSummary.reduce((a, r) => a + (r.unreadCount || 0), 0),
    [rideSummary],
  );

  const totalUnread = clubUnread + rideUnread;

  return { totalUnread, clubUnread, rideUnread, clubSummaryQuery, rideSummaryQuery };
}
