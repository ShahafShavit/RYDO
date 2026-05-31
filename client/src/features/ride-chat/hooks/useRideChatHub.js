import { useEffect, useRef, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import { useQueryClient } from '@tanstack/react-query';
import { env } from '@/shared/config/env';
import { getStoredToken } from '@/features/auth/utils/auth-storage';
import { useAuth } from '@/features/auth/hooks/useAuth';

export function useRideChatHub(rideId, enabled) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const connRef = useRef(null);

  const onMessage = useCallback(
    () => {
      if (rideId != null) {
        queryClient.invalidateQueries({ queryKey: ['rideChat', 'messages', rideId] });
      }
    },
    [queryClient, rideId],
  );

  useEffect(() => {
    if (!enabled || env.isMockApi || !user?.id || !rideId) return undefined;

    const url = `${env.apiBaseUrl.replace(/\/$/, '')}/hubs/ride-chat`;
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(url, {
        accessTokenFactory: () => getStoredToken() || '',
        withCredentials: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.ServerSentEvents,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .build();

    conn.on('ReceiveMessage', onMessage);
    connRef.current = conn;

    let cancelled = false;
    (async () => {
      try {
        await conn.start();
        if (cancelled) return;
        await conn.invoke('JoinRide', Number(rideId));
      } catch {
        /* REST still works */
      }
    })();

    return () => {
      cancelled = true;
      conn.stop();
      connRef.current = null;
    };
  }, [enabled, user?.id, rideId, onMessage]);

  return connRef;
}
