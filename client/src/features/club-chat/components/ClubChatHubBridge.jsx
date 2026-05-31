import { useCallback, useMemo } from 'react';
import { generatePath, useMatch, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ROUTES } from '@/app/router/route-paths';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { usePreferences } from '@/features/account/hooks/useAccount';
import { useRideEvent } from '@/features/rides/hooks/useRideEvent';
import { env } from '@/shared/config/env';
import { clubChatApi } from '@/features/club-chat/api/club-chat-api';
import { useClubChatHub } from '@/features/club-chat/hooks/useClubChatHub';
import { inboxKeys } from '@/features/social/hooks/useInbox';
import { inboxSummaryKeys } from '@/features/social/hooks/useInboxSummary';

/** Keeps club-chat SignalR connected and handles desktop notifications app-wide. */
export default function ClubChatHubBridge() {
  const { user } = useAuth();
  const { data: preferences } = usePreferences();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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

  const notifyHandler = useCallback(
    (payload) => {
      if (!payload || payload.authorUserId === user?.id) return;
      if (
        liveChatScoped &&
        liveScopedClubId != null &&
        Number(payload.clubId) !== Number(liveScopedClubId)
      ) {
        return;
      }
      if (typeof Notification === 'undefined') return;
      if (Notification.permission !== 'granted') return;
      if (preferences?.notificationsEnabled === false) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && document.hasFocus()) {
        return;
      }
      const title = payload.clubNameHint || payload.clubName || 'Club chat';
      const body = payload.body?.slice(0, 140) || 'New message';
      try {
        const n = new Notification(title, { body, tag: `club-chat-${payload.clubId}` });
        n.onclick = () => {
          window.focus();
          if (payload.clubId != null) {
            navigate(generatePath(ROUTES.chatThread, { clubId: String(payload.clubId) }));
          } else {
            navigate(ROUTES.chat);
          }
          n.close();
        };
      } catch {
        /* ignore */
      }
    },
    [user?.id, preferences?.notificationsEnabled, liveChatScoped, liveScopedClubId, navigate],
  );

  const clubJoinNotifyHandler = useCallback(
    (payload) => {
      queryClient.invalidateQueries({ queryKey: inboxSummaryKeys.all });
      queryClient.invalidateQueries({ queryKey: inboxKeys.all });
      if (typeof Notification === 'undefined') return;
      if (Notification.permission !== 'granted') return;
      if (preferences?.notificationsEnabled === false) return;
      if (
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible' &&
        document.hasFocus()
      ) {
        return;
      }
      const title = payload?.clubName || 'Club';
      const who = payload?.requesterName?.trim() || 'Someone';
      const body = `${who} requested to join`;
      try {
        const n = new Notification(title, { body, tag: `club-join-${payload?.clubId}` });
        n.onclick = () => {
          window.focus();
          n.close();
        };
      } catch {
        /* ignore */
      }
    },
    [preferences?.notificationsEnabled, queryClient],
  );

  useClubChatHub(summary, !!user?.id && !env.isMockApi, {
    onIncomingMessage: notifyHandler,
    onClubJoinRequest: clubJoinNotifyHandler,
    scopedClubId: liveChatScoped ? liveScopedClubId : null,
  });

  return null;
}
