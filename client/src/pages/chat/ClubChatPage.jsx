import { useCallback, useEffect, useMemo } from 'react';
import { generatePath, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ROUTES } from '@/app/router/route-paths';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { usePreferences } from '@/features/account/hooks/useAccount';
import { clubChatApi } from '@/features/club-chat/api/club-chat-api';
import ChatListBold from '@/features/club-chat/components/ChatListBold';
import ClubChatThread from '@/features/club-chat/components/ClubChatThread';
import RideChatThread from '@/features/ride-chat/components/RideChatThread';
import { rideChatApi } from '@/features/ride-chat/api/ride-chat-api';

export default function ClubChatPage() {
  const { user } = useAuth();
  const { data: preferences } = usePreferences();
  const navigate = useNavigate();
  const params = useParams();
  const clubIdParam = params.clubId;
  const rideIdParam = params.rideId;

  const threadClubId = useMemo(() => {
    if (!clubIdParam || rideIdParam) return null;
    const n = Number(clubIdParam);
    return Number.isFinite(n) ? n : null;
  }, [clubIdParam, rideIdParam]);

  const threadRideId = useMemo(() => {
    if (!rideIdParam) return null;
    const n = Number(rideIdParam);
    return Number.isFinite(n) ? n : null;
  }, [rideIdParam]);

  useEffect(() => {
    if (clubIdParam && threadClubId == null && !rideIdParam) {
      navigate(ROUTES.chat, { replace: true });
    }
  }, [clubIdParam, threadClubId, rideIdParam, navigate]);

  useEffect(() => {
    if (rideIdParam && threadRideId == null) {
      navigate(ROUTES.chat, { replace: true });
    }
  }, [rideIdParam, threadRideId, navigate]);

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

  const activeClub = useMemo(() => {
    if (!threadClubId) return null;
    return clubSummary.find((s) => s.clubId === threadClubId) ?? null;
  }, [threadClubId, clubSummary]);

  const handleSelectClub = useCallback(
    (row) => {
      navigate(generatePath(ROUTES.chatThread, { clubId: String(row.clubId) }));
    },
    [navigate],
  );

  const handleSelectRide = useCallback(
    (row) => {
      navigate(generatePath(ROUTES.chatRideThread, { rideId: String(row.rideId) }));
    },
    [navigate],
  );

  const handleBack = useCallback(() => {
    navigate(ROUTES.chat);
  }, [navigate]);

  useEffect(() => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'default') return;
    if (preferences?.notificationsEnabled === false) return;
    const p = Notification.requestPermission();
    if (p && typeof p.then === 'function') {
      p.catch(() => {});
    }
  }, [preferences?.notificationsEnabled]);

  if (!user?.id) return null;

  const isLoading = clubSummaryQuery.isLoading || rideSummaryQuery.isLoading;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col font-[Inter,sans-serif] text-fg">
      {threadRideId ? (
        <RideChatThread rideId={threadRideId} onBack={handleBack} />
      ) : threadClubId ? (
        <ClubChatThread
          clubId={threadClubId}
          activeClub={activeClub}
          onBack={handleBack}
        />
      ) : (
        <ChatListBold
          clubSummary={clubSummary}
          rideSummary={rideSummary}
          isLoading={isLoading}
          onSelectClub={handleSelectClub}
          onSelectRide={handleSelectRide}
          insetTabBar
        />
      )}
    </div>
  );
}
