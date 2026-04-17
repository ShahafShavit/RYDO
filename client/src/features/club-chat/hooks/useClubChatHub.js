import { useEffect, useRef, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import { useQueryClient } from '@tanstack/react-query';
import { env } from '@/shared/config/env';
import { getStoredToken } from '@/features/auth/utils/auth-storage';
import { useAuth } from '@/features/auth/hooks/useAuth';

/**
 * SignalR hub for club chat. Joins all clubs from summary when connected,
 * or a single club when `options.scopedClubId` is set (e.g. live ride map).
 */
export function useClubChatHub(summaryRows, enabled, options = {}) {
  const { onIncomingMessage, onClubJoinRequest, scopedClubId = null } = options;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const connRef = useRef(null);
  const summaryRef = useRef(summaryRows);
  const onExtraRef = useRef(onIncomingMessage);
  const onClubJoinRef = useRef(onClubJoinRequest);

  useEffect(() => {
    summaryRef.current = summaryRows;
  }, [summaryRows]);

  useEffect(() => {
    onExtraRef.current = onIncomingMessage;
  }, [onIncomingMessage]);

  useEffect(() => {
    onClubJoinRef.current = onClubJoinRequest;
  }, [onClubJoinRequest]);

  const onMessage = useCallback(
    (payload) => {
      const clubId = payload?.clubId;
      if (clubId != null) {
        queryClient.invalidateQueries({ queryKey: ['clubChat', 'messages', clubId] });
      }
      queryClient.invalidateQueries({ queryKey: ['clubChat', 'summary'] });
      onExtraRef.current?.(payload);
    },
    [queryClient]
  );

  useEffect(() => {
    if (!enabled || env.isMockApi || !user?.id) return undefined;

    const url = `${env.apiBaseUrl.replace(/\/$/, '')}/hubs/club-chat`;
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(url, {
        accessTokenFactory: () => getStoredToken() || '',
        // JWT is sent via access_token / negotiate; cookies not used — avoids credentialed CORS unless API allows it.
        withCredentials: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.ServerSentEvents,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .build();

    conn.on('ReceiveMessage', onMessage);
    conn.on('ClubJoinRequest', (payload) => {
      onClubJoinRef.current?.(payload);
    });
    connRef.current = conn;

    let cancelled = false;
    (async () => {
      try {
        await conn.start();
        if (cancelled) return;
        if (scopedClubId != null) {
          try {
            await conn.invoke('JoinClub', scopedClubId);
          } catch {
            /* ignore */
          }
        } else {
          const rows = summaryRef.current || [];
          for (const row of rows) {
            const id = row.clubId;
            if (id != null) {
              try {
                await conn.invoke('JoinClub', id);
              } catch {
                /* ignore */
              }
            }
          }
        }
      } catch {
        // React Strict Mode unmount can stop() mid-negotiation; ignore when cancelled.
        if (!cancelled) {
          /* connection failed — REST still works */
        }
      }
    })();

    return () => {
      cancelled = true;
      conn.stop();
      connRef.current = null;
    };
  }, [enabled, user?.id, onMessage, scopedClubId]);

  useEffect(() => {
    if (scopedClubId != null) return undefined;
    const conn = connRef.current;
    if (!conn || conn.state !== signalR.HubConnectionState.Connected) return undefined;
    const rows = summaryRows || [];
    let cancelled = false;
    (async () => {
      for (const row of rows) {
        if (cancelled) return;
        const id = row.clubId;
        if (id != null) {
          try {
            await conn.invoke('JoinClub', id);
          } catch {
            /* ignore */
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [summaryRows, scopedClubId]);
}
