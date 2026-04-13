import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { env } from '@/shared/config/env';
import { getStoredToken } from '@/features/auth/utils/auth-storage';
import {
  enableRideLiveDebugFromQuery,
  isRideLiveLogEnabled,
  rideLiveError,
  rideLiveLog,
  rideLiveWarn,
} from '@/features/live-ride/utils/rideLiveLog';

const MinSendMs = 2300;

/** SignalR may use camelCase or PascalCase depending on server JSON options. */
function normalizeHubRider(r) {
  if (r == null) return null;
  const userId = r.userId ?? r.UserId;
  if (userId == null) return null;
  const lat = Number(r.lat ?? r.Lat);
  const lng = Number(r.lng ?? r.Lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    if (isRideLiveLogEnabled()) {
      rideLiveWarn('normalizeHubRider dropped rider (bad lat/lng)', {
        userId,
        lat: r.lat ?? r.Lat,
        lng: r.lng ?? r.Lng,
        keys: r && typeof r === 'object' ? Object.keys(r) : [],
      });
    }
    return null;
  }
  return {
    userId: Number(userId),
    displayName: r.displayName ?? r.DisplayName ?? '',
    avatarUrl: r.avatarUrl ?? r.AvatarUrl ?? null,
    lat,
    lng,
    headingDeg: r.headingDeg ?? r.HeadingDeg ?? null,
    accuracyM: r.accuracyM ?? r.AccuracyM ?? null,
    atUtc: r.atUtc ?? r.AtUtc ?? null,
  };
}

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
  const sendPoseLogCountRef = useRef(0);
  const myId = myUserId != null ? Number(myUserId) : null;

  const status = useMemo(() => {
    if (!enabled || !rideId || env.isMockApi) return 'disabled';
    if (!getStoredToken()) return 'no_token';
    return connStatus;
  }, [enabled, rideId, connStatus]);

  const mergeRider = useCallback((r) => {
    const n = normalizeHubRider(r);
    if (n == null) return;
    if (myId != null && n.userId === myId) return;
    setPeersById((prev) => {
      const next = new Map(prev);
      next.set(n.userId, n);
      rideLiveLog('mergeRider → map size', { userId: n.userId, nextSize: next.size });
      return next;
    });
  }, [myId]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- SignalR hub connection lifecycle */
    if (enableRideLiveDebugFromQuery()) {
      rideLiveLog('debugRideLive query → enabled logging (localStorage)');
    }

    if (!enabled || !rideId || env.isMockApi) return undefined;

    const token = getStoredToken();
    if (!token) {
      rideLiveWarn('hub not started: no auth token');
      return undefined;
    }

    // Same-origin full-stack (Docker :5000, CloudFront): VITE_API_BASE_URL is empty — use path-only URL
    // like club chat; SignalR normalizes to ws://current-host/hubs/ride-live.
    const base = env.apiBaseUrl.replace(/\/$/, '');
    const url = base ? `${base}/hubs/ride-live` : '/hubs/ride-live';
    rideLiveLog('building connection', { url, rideId, myUserId: myId });

    const builder = new signalR.HubConnectionBuilder()
      .withUrl(url, {
        accessTokenFactory: () => getStoredToken() || '',
        withCredentials: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.ServerSentEvents,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000]);
    if (isRideLiveLogEnabled()) {
      builder.configureLogging(signalR.LogLevel.Debug);
      rideLiveLog('SignalR client logging: Debug (shows hub protocol messages / invocation targets)');
    }
    const conn = builder.build();

    conn.onreconnecting((err) => rideLiveWarn('SignalR reconnecting', err?.message ?? err));
    conn.onreconnected((id) => rideLiveLog('SignalR reconnected', { connectionId: id }));
    conn.onclose((err) => rideLiveLog('SignalR closed', err?.message ?? err ?? '(clean)'));

    conn.on('RidersState', (payload) => {
      const riders = Array.isArray(payload?.riders) ? payload.riders : [];
      rideLiveLog('← RidersState', {
        rideId,
        myId,
        rawRiderCount: riders.length,
        payloadKeys: payload && typeof payload === 'object' ? Object.keys(payload) : [],
        sampleRaw: riders[0] ?? null,
      });
      const m = new Map();
      for (const r of riders) {
        const n = normalizeHubRider(r);
        if (n == null) continue;
        if (myId != null && n.userId === myId) continue;
        m.set(n.userId, n);
      }
      rideLiveLog('RidersState → peers map (excl. self)', { rideId, peerCount: m.size, peerIds: [...m.keys()] });
      setPeersById(m);
    });

    conn.on('RiderMoved', (r) => {
      rideLiveLog('← RiderMoved raw', {
        rideId,
        r,
        keys: r && typeof r === 'object' ? Object.keys(r) : [],
      });
      mergeRider(r);
    });

    conn.on('RiderLeft', (payload) => {
      rideLiveLog('← RiderLeft', payload);
      const userId = payload?.userId ?? payload?.UserId;
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
        rideLiveLog('SignalR start…');
        await conn.start();
        if (cancelled) return;
        rideLiveLog('SignalR started', { state: conn.state, connectionId: conn.connectionId });
        await conn.invoke('JoinRide', Number(rideId));
        if (cancelled) return;
        rideLiveLog('JoinRide invoke OK', { rideId });
        setConnStatus('connected');
      } catch (e) {
        if (!cancelled) {
          rideLiveError('hub start or JoinRide failed', e);
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
    if (!c || c.state !== signalR.HubConnectionState.Connected) {
      if (isRideLiveLogEnabled()) {
        rideLiveLog('sendPose skipped (not connected)', { state: c?.state });
      }
      return;
    }
    const now = Date.now();
    if (now - lastSendRef.current < MinSendMs) return;
    lastSendRef.current = now;
    const atUtc = new Date().toISOString();
    if (isRideLiveLogEnabled()) {
      sendPoseLogCountRef.current += 1;
      const n = sendPoseLogCountRef.current;
      if (n <= 3 || n % 12 === 0) {
        rideLiveLog('→ UpdatePose', { n, lat, lng, headingDeg, accuracyM, atUtc });
      }
    }
    c.invoke('UpdatePose', lat, lng, headingDeg ?? null, accuracyM ?? null, atUtc).catch((err) => {
      rideLiveWarn('UpdatePose invoke failed', err);
    });
  }, []);

  return { peersById, status, hubError, sendPose };
}
