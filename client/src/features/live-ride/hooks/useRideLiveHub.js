import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { env } from '@/shared/config/env';
import { getStoredToken } from '@/features/auth/utils/auth-storage';

const MinSendMs = 2300;

/**
 * @param {string|number|undefined|null} rideId
 * @param {boolean} enabled
 * @param {number | null | undefined} myUserId — excluded from peer map for display (snapshot may include stale self).
 */
export function useRideLiveHub(rideId, enabled, myUserId) {
  const [peersById, setPeersById] = useState(() => new Map());
  const [connStatus, setConnStatus] = useState('idle');
  const [hubError, setHubError] = useState(null);
  const connRef = useRef(null);
  const lastSendRef = useRef(0);
  const myId = myUserId != null ? Number(myUserId) : null;

  const status = useMemo(() => {
    if (!enabled || !rideId || env.isMockApi) return 'disabled';
    if (!getStoredToken()) return 'no_token';
    return connStatus;
  }, [enabled, rideId, connStatus]);

  const mergeRider = useCallback((r) => {
    if (r == null || r.userId == null) return;
    if (myId != null && Number(r.userId) === myId) return;
    setPeersById((prev) => {
      const next = new Map(prev);
      next.set(Number(r.userId), r);
      return next;
    });
  }, [myId]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- SignalR hub connection lifecycle */
    if (!enabled || !rideId || env.isMockApi) return undefined;

    const token = getStoredToken();
    if (!token) return undefined;

    // Same-origin full-stack (Docker :5000, CloudFront): VITE_API_BASE_URL is empty — use path-only URL
    // like club chat; SignalR normalizes to ws://current-host/hubs/ride-live.
    const base = env.apiBaseUrl.replace(/\/$/, '');
    const url = base ? `${base}/hubs/ride-live` : '/hubs/ride-live';
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(url, {
        accessTokenFactory: () => getStoredToken() || '',
        withCredentials: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.ServerSentEvents,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .build();

    conn.on('RidersState', (payload) => {
      const riders = Array.isArray(payload?.riders) ? payload.riders : [];
      const m = new Map();
      for (const r of riders) {
        if (r?.userId == null) continue;
        if (myId != null && Number(r.userId) === myId) continue;
        m.set(Number(r.userId), r);
      }
      setPeersById(m);
    });

    conn.on('RiderMoved', (r) => mergeRider(r));

    conn.on('RiderLeft', ({ userId }) => {
      if (userId == null) return;
      setPeersById((prev) => {
        const next = new Map(prev);
        next.delete(Number(userId));
        return next;
      });
    });

    connRef.current = conn;
    setConnStatus('connecting');
    setHubError(null);

    let cancelled = false;
    (async () => {
      try {
        await conn.start();
        if (cancelled) return;
        await conn.invoke('JoinRide', Number(rideId));
        if (cancelled) return;
        setConnStatus('connected');
      } catch (e) {
        if (!cancelled) {
          setHubError(e instanceof Error ? e : new Error(String(e)));
          setConnStatus('error');
        }
      }
    })();

    return () => {
      cancelled = true;
      connRef.current = null;
      conn.stop().catch(() => {});
      setPeersById(new Map());
      setConnStatus('idle');
    };
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [enabled, rideId, mergeRider, myId]);

  const sendPose = useCallback((lat, lng, headingDeg, accuracyM) => {
    const c = connRef.current;
    if (!c || c.state !== signalR.HubConnectionState.Connected) return;
    const now = Date.now();
    if (now - lastSendRef.current < MinSendMs) return;
    lastSendRef.current = now;
    const atUtc = new Date().toISOString();
    c.invoke('UpdatePose', lat, lng, headingDeg ?? null, accuracyM ?? null, atUtc).catch(() => {});
  }, []);

  return { peersById, status, hubError, sendPose };
}
