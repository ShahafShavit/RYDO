import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { env } from '@/shared/config/env';
import { getStoredToken } from '@/features/auth/utils/auth-storage';
import {
  createPosePublisher,
  mergePeer,
  normalizeHubRider,
  peersFromRidersState,
  removePeer,
  transportReducer,
} from '@/features/live-ride/connectivity/rideLiveConnectivity';
import { VISIBILITY_RETRY_DEBOUNCE_MS } from '@/features/live-ride/connectivity/rideLiveTiming';
import {
  enableRideLiveDebugFromQuery,
  isRideLiveLogEnabled,
  rideLiveError,
  rideLiveLog,
  rideLiveWarn,
} from '@/features/live-ride/utils/rideLiveLog';

/**
 * @param {string|number|undefined|null} rideId
 * @param {boolean} enabled
 * @param {number | null | undefined} myUserId — excluded from peer map for display (snapshot may include stale self).
 */
export function useRideLiveHub(rideId, enabled, myUserId) {
  const [peersById, setPeersById] = useState(() => new Map());
  const [transportState, dispatchTransport] = useReducer(transportReducer, 'idle');
  const [hubError, setHubError] = useState(null);

  const connRef = useRef(null);
  const cancelledRef = useRef(false);
  const retryInFlightRef = useRef(false);
  const lastVisibilityRetryRef = useRef(0);
  const transportStateRef = useRef(transportState);
  const myId = myUserId != null ? Number(myUserId) : null;

  transportStateRef.current = transportState;

  const resolvedTransport =
    !enabled || !rideId || env.isMockApi
      ? 'disabled'
      : !getStoredToken()
        ? 'no_token'
        : transportState;

  const publisher = useMemo(
    () =>
      createPosePublisher({
        getTransportState: () => transportStateRef.current,
        invokeUpdatePose: async (lat, lng, headingDeg, accuracyM, atUtc) => {
          const c = connRef.current;
          if (!c) return;
          await c.invoke('UpdatePose', lat, lng, headingDeg, accuracyM, atUtc);
        },
      }),
    [],
  );

  const invokeJoinRide = useCallback(
    async (conn) => {
      const { hadPendingPose, pending } = publisher.joinArgs();
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
      publisher.markJoinSent(hadPendingPose);
      rideLiveLog('JoinRide invoke OK', { rideId, hadPendingPose });
    },
    [rideId, publisher],
  );

  const offerPose = useCallback(
    (lat, lng, headingDeg, accuracyM) => {
      publisher.offerPose(lat, lng, headingDeg, accuracyM);
    },
    [publisher],
  );

  useEffect(() => {
    if (enableRideLiveDebugFromQuery()) {
      rideLiveLog('debugRideLive query → enabled logging (localStorage)');
    }

    if (!enabled || !rideId || env.isMockApi) {
      dispatchTransport({ type: 'DISABLE', reason: 'hub_disabled_or_mock' });
      return undefined;
    }

    const token = getStoredToken();
    if (!token) {
      rideLiveWarn('hub not started: no auth token');
      dispatchTransport({ type: 'NO_TOKEN', reason: 'missing_auth_token' });
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
    publisher.reset();
    dispatchTransport({ type: 'START', reason: 'hub_effect_mount' });
    setHubError(null);

    const ensureRideSession = async () => {
      if (cancelledRef.current) return false;
      try {
        await invokeJoinRide(conn);
        if (cancelledRef.current) return false;
        dispatchTransport({ type: 'JOIN_OK', reason: 'JoinRide_invoke_succeeded' });
        setHubError(null);
        rideLiveLog('transport → joined', { rideId });
        return true;
      } catch (e) {
        if (!cancelledRef.current) {
          rideLiveError('JoinRide failed', e);
          dispatchTransport({ type: 'JOIN_FAIL', reason: 'JoinRide_invoke_failed' });
          setHubError(e instanceof Error ? e : new Error(String(e)));
        }
        return false;
      }
    };

    conn.onreconnecting((err) => {
      dispatchTransport({ type: 'RECONNECTING', reason: err?.message ?? 'signalr_onreconnecting' });
      rideLiveWarn('SignalR reconnecting', err?.message ?? err);
      rideLiveLog('transport → reconnecting', { rideId });
    });

    conn.onreconnected(async (id) => {
      rideLiveLog('SignalR reconnected', { connectionId: id });
      if (cancelledRef.current) return;
      dispatchTransport({ type: 'RECONNECTED', reason: 'signalr_onreconnected' });
      await ensureRideSession();
    });

    conn.onclose((err) => {
      rideLiveLog('SignalR closed', err?.message ?? err ?? '(clean)');
      if (!cancelledRef.current) {
        dispatchTransport({ type: 'CLOSED', reason: err?.message ?? 'signalr_onclose' });
        rideLiveLog('transport → offline', { rideId });
      }
    });

    conn.on('RidersState', (payload) => {
      const riders = Array.isArray(payload?.riders) ? payload.riders : [];
      rideLiveLog('← RidersState', {
        rideId,
        myId,
        rawRiderCount: riders.length,
        payloadKeys: payload && typeof payload === 'object' ? Object.keys(payload) : [],
        sampleRaw: riders[0] ?? null,
      });
      const m = peersFromRidersState(payload, myId);
      rideLiveLog('RidersState → peers map (excl. self)', { rideId, peerCount: m.size, peerIds: [...m.keys()] });
      setPeersById(m);
    });

    conn.on('RiderMoved', (r) => {
      const n = normalizeHubRider(r);
      rideLiveLog('← RiderMoved raw', {
        rideId,
        r,
        keys: r && typeof r === 'object' ? Object.keys(r) : [],
        isStale: n?.isStale ?? null,
      });
      if (n?.isStale) {
        rideLiveLog('peer liveness stale (wire)', { rideId, userId: n.userId, atUtc: n.atUtc });
      }
      setPeersById((prev) => mergePeer(prev, r, myId));
    });

    conn.on('RiderLeft', (payload) => {
      rideLiveLog('← RiderLeft', payload);
      const userId = payload?.userId ?? payload?.UserId;
      if (userId == null) return;
      setPeersById((prev) => removePeer(prev, Number(userId)));
    });

    connRef.current = conn;

    (async () => {
      try {
        rideLiveLog('SignalR start…');
        await conn.start();
        if (cancelledRef.current) return;
        rideLiveLog('SignalR started', { state: conn.state, connectionId: conn.connectionId });
        dispatchTransport({ type: 'SIGNALR_STARTED', reason: 'signalr_start_succeeded' });
        await ensureRideSession();
      } catch (e) {
        if (!cancelledRef.current) {
          rideLiveError('hub start failed', e);
          dispatchTransport({ type: 'JOIN_FAIL', reason: 'signalr_start_failed' });
          setHubError(e instanceof Error ? e : new Error(String(e)));
        }
      }
    })();

    return () => {
      rideLiveLog('hub cleanup (unmount / leave page)', { rideId, connectionId: conn.connectionId });
      cancelledRef.current = true;
      connRef.current = null;
      conn.stop().catch(() => {});
      publisher.reset();
      setPeersById(new Map());
      dispatchTransport({ type: 'CLEANUP', reason: 'hub_effect_unmount' });
    };
  }, [enabled, rideId, myId, invokeJoinRide, publisher]);

  const retryHub = useCallback(async () => {
    const conn = connRef.current;
    if (!conn || retryInFlightRef.current) return;
    retryInFlightRef.current = true;
    setHubError(null);
    dispatchTransport({ type: 'RETRY', reason: 'manual_or_visibility_retry' });
    try {
      if (conn.state === signalR.HubConnectionState.Connected) {
        await conn.stop();
      }
      rideLiveLog('retryHub: start…');
      await conn.start();
      dispatchTransport({ type: 'SIGNALR_STARTED', reason: 'retryHub_start_succeeded' });
      await invokeJoinRide(conn);
      dispatchTransport({ type: 'JOIN_OK', reason: 'retryHub_JoinRide_succeeded' });
      setHubError(null);
      rideLiveLog('retryHub: JoinRide OK', { rideId });
    } catch (e) {
      rideLiveError('retryHub failed', e);
      dispatchTransport({ type: 'JOIN_FAIL', reason: 'retryHub_failed' });
      setHubError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      retryInFlightRef.current = false;
    }
  }, [rideId, invokeJoinRide]);

  useEffect(() => {
    if (!enabled || !rideId || env.isMockApi) return undefined;

    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const st = transportStateRef.current;
      if (st !== 'offline' && st !== 'error') return;
      const now = Date.now();
      if (now - lastVisibilityRetryRef.current < VISIBILITY_RETRY_DEBOUNCE_MS) return;
      lastVisibilityRetryRef.current = now;
      rideLiveLog('visibility visible → retryHub', { transportState: st });
      retryHub();
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [enabled, rideId, retryHub]);

  return { peersById, transportState: resolvedTransport, hubError, offerPose, retryHub };
}
