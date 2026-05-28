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
const VisibilityRetryDebounceMs = 2000;

function isValidPoseCoords(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng);
}

/** @returns {boolean} whether a pending pose was included in JoinRide */
function pendingPoseForJoin(pending) {
  if (pending == null || !isValidPoseCoords(pending.lat, pending.lng)) return false;
  return true;
}

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
  const rawStale = r.isStale ?? r.IsStale;
  const isStale = rawStale === true || rawStale === 'true';
  return {
    userId: Number(userId),
    displayName: r.displayName ?? r.DisplayName ?? '',
    avatarUrl: r.avatarUrl ?? r.AvatarUrl ?? null,
    lat,
    lng,
    headingDeg: r.headingDeg ?? r.HeadingDeg ?? null,
    accuracyM: r.accuracyM ?? r.AccuracyM ?? null,
    atUtc: r.atUtc ?? r.AtUtc ?? null,
    isStale,
  };
}

/**
 * @param {unknown} payload
 * @param {number | null} myId
 */
export function peersMapFromRidersState(payload, myId) {
  const riders = Array.isArray(payload?.riders) ? payload.riders : [];
  const m = new Map();
  for (const r of riders) {
    const n = normalizeHubRider(r);
    if (n == null) continue;
    if (myId != null && n.userId === myId) continue;
    m.set(n.userId, n);
  }
  return m;
}

/**
 * @param {string|number|undefined|null} rideId
 * @param {boolean} enabled
 * @param {number | null | undefined} myUserId — excluded from peer map for display (snapshot may include stale self).
 */
export function useRideLiveHub(rideId, enabled, myUserId) {
  const [peersById, setPeersById] = useState(() => new Map());
  const [connStatus, setConnStatus] = useState('idle');
  const [peersStale, setPeersStale] = useState(false);
  const [hubError, setHubError] = useState(null);
  const connRef = useRef(null);
  const sessionReadyRef = useRef(false);
  const cancelledRef = useRef(false);
  const lastSendRef = useRef(0);
  const pendingPoseRef = useRef(null);
  const sendPoseLogCountRef = useRef(0);
  const retryInFlightRef = useRef(false);
  const lastVisibilityRetryRef = useRef(0);
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

  const applyRidersState = useCallback(
    (payload) => {
      const riders = Array.isArray(payload?.riders) ? payload.riders : [];
      rideLiveLog('← RidersState', {
        rideId,
        myId,
        rawRiderCount: riders.length,
        payloadKeys: payload && typeof payload === 'object' ? Object.keys(payload) : [],
        sampleRaw: riders[0] ?? null,
      });
      const m = peersMapFromRidersState(payload, myId);
      rideLiveLog('RidersState → peers map (excl. self)', { rideId, peerCount: m.size, peerIds: [...m.keys()] });
      setPeersById(m);
      setPeersStale(false);
    },
    [rideId, myId],
  );

  const invokeJoinRide = useCallback(async (conn) => {
    const pending = pendingPoseRef.current;
    const hadPendingPose = pendingPoseForJoin(pending);
    rideLiveLog('JoinRide invoke…', { rideId, hadPendingPose });
    await conn.invoke(
      'JoinRide',
      Number(rideId),
      hadPendingPose ? pending.lat : null,
      hadPendingPose ? pending.lng : null,
      hadPendingPose ? pending.headingDeg ?? null : null,
      hadPendingPose ? pending.accuracyM ?? null : null,
      hadPendingPose ? pending.atUtc ?? null : null,
    );
    if (hadPendingPose) {
      lastSendRef.current = Date.now();
    } else {
      lastSendRef.current = 0;
    }
    rideLiveLog('JoinRide invoke OK', { rideId, hadPendingPose });
  }, [rideId]);

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

    const base = env.apiBaseUrl.replace(/\/$/, '');
    const url = base ? `${base}/hubs/ride-live` : '/hubs/ride-live';
    rideLiveLog('building connection', { url, rideId, myUserId: myId });

    const builder = new signalR.HubConnectionBuilder()
      .withUrl(url, {
        accessTokenFactory: () => getStoredToken() || '',
        withCredentials: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.ServerSentEvents,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .withKeepAliveInterval(15000)
      .withServerTimeout(60000);
    if (isRideLiveLogEnabled()) {
      builder.configureLogging(signalR.LogLevel.Debug);
      rideLiveLog('SignalR client logging: Debug (shows hub protocol messages / invocation targets)');
    }

    const conn = builder.build();

    cancelledRef.current = false;
    sessionReadyRef.current = false;

    const ensureRideSession = async () => {
      if (cancelledRef.current) return false;
      try {
        await invokeJoinRide(conn);
        if (cancelledRef.current) return false;
        sessionReadyRef.current = true;
        setHubError(null);
        setConnStatus('connected');
        return true;
      } catch (e) {
        if (!cancelledRef.current) {
          rideLiveError('JoinRide failed', e);
          sessionReadyRef.current = false;
          setHubError(e instanceof Error ? e : new Error(String(e)));
          setConnStatus('error');
        }
        return false;
      }
    };

    conn.onreconnecting((err) => {
      sessionReadyRef.current = false;
      setPeersStale(true);
      setConnStatus('reconnecting');
      rideLiveWarn('SignalR reconnecting', err?.message ?? err);
    });

    conn.onreconnected(async (id) => {
      rideLiveLog('SignalR reconnected', { connectionId: id });
      if (cancelledRef.current) return;
      setConnStatus('syncing');
      await ensureRideSession();
    });

    conn.onclose((err) => {
      sessionReadyRef.current = false;
      rideLiveLog('SignalR closed', err?.message ?? err ?? '(clean)');
      if (!cancelledRef.current) {
        setConnStatus('disconnected');
      }
    });

    conn.on('RidersState', applyRidersState);

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
    setPeersStale(false);

    (async () => {
      try {
        rideLiveLog('SignalR start…');
        await conn.start();
        if (cancelledRef.current) return;
        rideLiveLog('SignalR started', { state: conn.state, connectionId: conn.connectionId });
        setConnStatus('syncing');
        await ensureRideSession();
      } catch (e) {
        if (!cancelledRef.current) {
          rideLiveError('hub start failed', e);
          sessionReadyRef.current = false;
          setHubError(e instanceof Error ? e : new Error(String(e)));
          setConnStatus('error');
        }
      }
    })();

    return () => {
      cancelledRef.current = true;
      sessionReadyRef.current = false;
      connRef.current = null;
      conn.stop().catch(() => {});
      setPeersById(new Map());
      setPeersStale(false);
      setConnStatus('idle');
    };
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [enabled, rideId, mergeRider, myId, applyRidersState, invokeJoinRide]);

  const retryHub = useCallback(async () => {
    const conn = connRef.current;
    if (!conn || retryInFlightRef.current) return;
    retryInFlightRef.current = true;
    sessionReadyRef.current = false;
    setHubError(null);
    setConnStatus('connecting');
    setPeersStale(false);
    try {
      if (conn.state === signalR.HubConnectionState.Connected) {
        await conn.stop();
      }
      rideLiveLog('retryHub: start…');
      await conn.start();
      setConnStatus('syncing');
      await invokeJoinRide(conn);
      sessionReadyRef.current = true;
      setConnStatus('connected');
      setHubError(null);
      rideLiveLog('retryHub: JoinRide OK', { rideId });
    } catch (e) {
      rideLiveError('retryHub failed', e);
      sessionReadyRef.current = false;
      setHubError(e instanceof Error ? e : new Error(String(e)));
      setConnStatus('error');
    } finally {
      retryInFlightRef.current = false;
    }
  }, [rideId, invokeJoinRide]);

  useEffect(() => {
    if (!enabled || !rideId || env.isMockApi) return undefined;

    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const st = connStatus;
      if (st !== 'disconnected' && st !== 'error') return;
      const now = Date.now();
      if (now - lastVisibilityRetryRef.current < VisibilityRetryDebounceMs) return;
      lastVisibilityRetryRef.current = now;
      rideLiveLog('visibility visible → retryHub', { connStatus: st });
      retryHub();
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [enabled, rideId, connStatus, retryHub]);

  /** lat/lng are typically fused synthetic pose from the live map (not raw GPS). */
  const sendPose = useCallback((lat, lng, headingDeg, accuracyM) => {
    if (isValidPoseCoords(lat, lng)) {
      pendingPoseRef.current = {
        lat,
        lng,
        headingDeg: headingDeg ?? null,
        accuracyM: accuracyM ?? null,
        atUtc: new Date().toISOString(),
      };
    }

    const c = connRef.current;
    const canSend =
      sessionReadyRef.current &&
      c &&
      c.state === signalR.HubConnectionState.Connected;
    if (!canSend) {
      if (isRideLiveLogEnabled()) {
        rideLiveLog('sendPose skipped', {
          sessionReady: sessionReadyRef.current,
          state: c?.state,
          buffered: pendingPoseRef.current != null,
        });
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

  return { peersById, status, hubError, sendPose, retryHub, peersStale };
}
