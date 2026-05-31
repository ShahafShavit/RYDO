import { useCallback, useEffect, useMemo } from 'react';
import { generatePath, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ROUTES } from '@/app/router/route-paths';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { usePreferences } from '@/features/account/hooks/useAccount';
import { clubChatApi } from '@/features/club-chat/api/club-chat-api';
import ClubChatListBold from '@/features/club-chat/components/ClubChatListBold';
import ClubChatThread from '@/features/club-chat/components/ClubChatThread';

export default function ClubChatPage() {
  const { user } = useAuth();
  const { data: preferences } = usePreferences();
  const navigate = useNavigate();
  const { clubId: clubIdParam } = useParams();

  const threadClubId = useMemo(() => {
    if (!clubIdParam) return null;
    const n = Number(clubIdParam);
    return Number.isFinite(n) ? n : null;
  }, [clubIdParam]);

  useEffect(() => {
    if (clubIdParam && threadClubId == null) {
      navigate(ROUTES.chat, { replace: true });
    }
  }, [clubIdParam, threadClubId, navigate]);

  const summaryQuery = useQuery({
    queryKey: ['clubChat', 'summary'],
    queryFn: () => clubChatApi.getSummary(),
    enabled: !!user?.id,
    staleTime: 15_000,
  });

  const summary = useMemo(() => summaryQuery.data || [], [summaryQuery.data]);

  const activeClub = useMemo(() => {
    if (!threadClubId) return null;
    return summary.find((s) => s.clubId === threadClubId) ?? null;
  }, [threadClubId, summary]);

  const handleSelectClub = useCallback(
    (row) => {
      navigate(generatePath(ROUTES.chatThread, { clubId: String(row.clubId) }));
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

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col font-[Inter,sans-serif] text-fg">
      {threadClubId ? (
        <ClubChatThread
          clubId={threadClubId}
          activeClub={activeClub}
          onBack={handleBack}
        />
      ) : (
        <ClubChatListBold
          summary={summary}
          isLoading={summaryQuery.isLoading}
          onSelectClub={handleSelectClub}
          insetTabBar
        />
      )}
    </div>
  );
}
