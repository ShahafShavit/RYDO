using System.Collections.Concurrent;
using Microsoft.AspNetCore.SignalR;
using Rydo.Api.Hubs;

namespace Rydo.Api.Services.RideLive;

/// <summary>In-memory rider sessions per ride for join snapshots and liveness.</summary>
public sealed class RideLivePoseStore(
    IHubContext<RideLiveHub> hubContext,
    ILogger<RideLivePoseStore> logger)
{
    private readonly ConcurrentDictionary<(int RideId, int UserId), RideLiveRiderSession> _sessions = new();
    private readonly ConcurrentDictionary<(int RideId, int UserId), CancellationTokenSource> _livenessTimers = new();
    private readonly ConcurrentDictionary<(int RideId, int UserId), CancellationTokenSource> _graceTimers = new();

    /// <summary>Stores pose and returns wire state; liveness clears synchronously on pose.</summary>
    public RiderPoseDto SetPose(int rideId, RiderPoseDto dto, string source = "update_pose")
    {
        CancelScheduledRemoval(rideId, dto.UserId, $"pose_received:{source}");

        var key = (rideId, dto.UserId);
        var utcNow = DateTime.UtcNow;
        var hadSession = _sessions.TryGetValue(key, out var prior);
        var prevPresence = hadSession && prior != null ? prior.Presence : RiderPresence.Absent;
        var prevLiveness = hadSession && prior != null ? prior.Liveness : (PoseLiveness?)null;

        var session = _sessions.AddOrUpdate(
            key,
            _ => RideLiveRiderSession.FromJoin(dto, utcNow),
            (_, existing) => existing.WithPresentFromGrace().WithPose(dto, utcNow));

        _sessions[key] = session;
        LogSessionTransitions(rideId, dto.UserId, prevPresence, prevLiveness, session, source);
        ScheduleLivenessCheck(rideId, dto.UserId, reason: $"pose_set:{source}");

        var wire = session.ToWirePose();
        RideLiveDiagnostics.Pose(
            logger,
            LogLevel.Debug,
            rideId,
            dto.UserId,
            "stored",
            source,
            dto.Lat,
            dto.Lng,
            wire.IsStale);

        return wire;
    }

    /// <summary>Cancels pending removal when a rider re-joins before grace expires.</summary>
    public void CancelScheduledRemoval(int rideId, int userId, string reason = "rejoin")
    {
        CancelGraceTimer(rideId, userId, reason);

        var key = (rideId, userId);
        if (!_sessions.TryGetValue(key, out var session))
            return;

        var restored = session.WithPresentFromGrace();
        if (restored.Presence == session.Presence)
            return;

        _sessions[key] = restored;
        ScheduleLivenessCheck(rideId, userId, reason: $"presence_restored:{reason}");
        RideLiveDiagnostics.StateTransition(
            logger,
            rideId,
            userId,
            "presence",
            RiderPresence.Grace.ToString(),
            RiderPresence.Present.ToString(),
            reason);
    }

    /// <summary>Schedules session removal and RiderLeft after disconnect grace; marks pose stale immediately.</summary>
    public void ScheduleRiderRemoval(int rideId, int userId, int graceSeconds = RideLiveTiming.DisconnectGraceSeconds)
    {
        CancelGraceTimer(rideId, userId, "reschedule_disconnect_grace");
        CancelLivenessTimer(rideId, userId, "hub_disconnect_cancel_liveness");

        var key = (rideId, userId);
        if (_sessions.TryGetValue(key, out var session))
        {
            var updated = session;
            if (session.Presence != RiderPresence.Grace)
            {
                updated = updated.WithGrace();
                RideLiveDiagnostics.StateTransition(
                    logger,
                    rideId,
                    userId,
                    "presence",
                    session.Presence.ToString(),
                    RiderPresence.Grace.ToString(),
                    "hub_disconnect_grace_started",
                    detail: $"graceSec={graceSeconds}");
            }

            if (updated.Liveness == PoseLiveness.Live)
            {
                updated = updated.WithLivenessStale();
                _sessions[key] = updated;
                RideLiveDiagnostics.StateTransition(
                    logger,
                    rideId,
                    userId,
                    "liveness",
                    PoseLiveness.Live.ToString(),
                    PoseLiveness.Stale.ToString(),
                    "hub_disconnect_immediate_stale",
                    detail: $"graceSec={graceSeconds}");
                _ = BroadcastStalePoseAsync(rideId, userId, updated, "hub_disconnect");
            }
            else
            {
                _sessions[key] = updated;
            }
        }

        var cts = InstallGraceTimer(rideId, userId);
        if (cts == null)
            return;

        RideLiveDiagnostics.Timer(
            logger,
            "scheduled",
            "grace",
            rideId,
            userId,
            "hub_disconnect",
            graceSeconds);

        _ = RunGraceExpiryAsync(rideId, userId, graceSeconds, cts);
    }

    public bool TryGetPose(int rideId, int userId, out RiderPoseDto dto)
    {
        if (_sessions.TryGetValue((rideId, userId), out var session))
        {
            dto = session.ToWirePose();
            return true;
        }

        dto = default!;
        return false;
    }

    public IReadOnlyList<RiderPoseDto> GetSnapshot(int rideId)
    {
        var list = _sessions
            .Where(kv => kv.Key.RideId == rideId && kv.Value.Presence != RiderPresence.Absent)
            .Select(kv => kv.Value.ToWirePose())
            .ToList();

        logger.LogDebug(
            "{Tag} snapshot ride={RideId} count={Count}",
            RideLiveDiagnostics.Tag,
            rideId,
            list.Count);
        return list;
    }

    public void RemoveRider(int rideId, int userId, string reason = "removed")
    {
        CancelLivenessTimer(rideId, userId, reason);
        CancelGraceTimer(rideId, userId, reason);

        if (_sessions.TryRemove((rideId, userId), out var removed))
        {
            RideLiveDiagnostics.StateTransition(
                logger,
                rideId,
                userId,
                "presence",
                removed.Presence.ToString(),
                RiderPresence.Absent.ToString(),
                reason,
                detail: $"lastLiveness={removed.Liveness}");
        }
    }

    private void LogSessionTransitions(
        int rideId,
        int userId,
        RiderPresence prevPresence,
        PoseLiveness? prevLiveness,
        RideLiveRiderSession session,
        string source)
    {
        if (prevPresence == RiderPresence.Absent)
        {
            RideLiveDiagnostics.StateTransition(
                logger,
                rideId,
                userId,
                "presence",
                RiderPresence.Absent.ToString(),
                session.Presence.ToString(),
                source);
        }
        else if (prevPresence == RiderPresence.Grace && session.Presence == RiderPresence.Present)
        {
            RideLiveDiagnostics.StateTransition(
                logger,
                rideId,
                userId,
                "presence",
                RiderPresence.Grace.ToString(),
                RiderPresence.Present.ToString(),
                source);
        }

        if (prevLiveness == null)
        {
            RideLiveDiagnostics.StateTransition(
                logger,
                rideId,
                userId,
                "liveness",
                "none",
                session.Liveness.ToString(),
                source);
        }
        else if (prevLiveness == PoseLiveness.Stale && session.Liveness == PoseLiveness.Live)
        {
            RideLiveDiagnostics.StateTransition(
                logger,
                rideId,
                userId,
                "liveness",
                PoseLiveness.Stale.ToString(),
                PoseLiveness.Live.ToString(),
                source);
        }
    }

    private void CancelLivenessTimer(int rideId, int userId, string reason)
    {
        if (!_livenessTimers.TryRemove((rideId, userId), out var cts))
            return;

        CancelAndDisposeCts(cts);
        RideLiveDiagnostics.Timer(logger, "cancelled", "liveness", rideId, userId, reason);
    }

    private void CancelGraceTimer(int rideId, int userId, string reason)
    {
        if (!_graceTimers.TryRemove((rideId, userId), out var cts))
            return;

        CancelAndDisposeCts(cts);
        RideLiveDiagnostics.Timer(logger, "cancelled", "grace", rideId, userId, reason);
    }

    private void ScheduleLivenessCheck(
        int rideId,
        int userId,
        int staleSeconds = RideLiveTiming.PoseStaleSeconds,
        string reason = "pose_activity")
    {
        var cts = InstallLivenessTimer(rideId, userId);
        if (cts == null)
            return;

        RideLiveDiagnostics.Timer(
            logger,
            "scheduled",
            "liveness",
            rideId,
            userId,
            reason,
            staleSeconds);

        _ = RunStaleExpiryAsync(rideId, userId, staleSeconds, cts);
    }

    /// <summary>Atomically installs a timer; cancels/disposes any prior CTS for the same rider.</summary>
    private CancellationTokenSource? InstallLivenessTimer(int rideId, int userId)
    {
        var key = (rideId, userId);
        var cts = new CancellationTokenSource();
        CancellationTokenSource? replaced = null;

        _livenessTimers.AddOrUpdate(
            key,
            cts,
            (_, old) =>
            {
                replaced = old;
                return cts;
            });

        if (replaced != null)
        {
            CancelAndDisposeCts(replaced);
            RideLiveDiagnostics.Timer(
                logger,
                "cancelled",
                "liveness",
                rideId,
                userId,
                "replaced_by_new_schedule");
        }

        return cts;
    }

    private CancellationTokenSource? InstallGraceTimer(int rideId, int userId)
    {
        var key = (rideId, userId);
        var cts = new CancellationTokenSource();
        CancellationTokenSource? replaced = null;

        _graceTimers.AddOrUpdate(
            key,
            cts,
            (_, old) =>
            {
                replaced = old;
                return cts;
            });

        if (replaced != null)
        {
            CancelAndDisposeCts(replaced);
            RideLiveDiagnostics.Timer(
                logger,
                "cancelled",
                "grace",
                rideId,
                userId,
                "replaced_by_new_schedule");
        }

        return cts;
    }

    private async Task RunGraceExpiryAsync(int rideId, int userId, int graceSeconds, CancellationTokenSource cts)
    {
        var key = (rideId, userId);
        try
        {
            try
            {
                await Task.Delay(TimeSpan.FromSeconds(graceSeconds), cts.Token).ConfigureAwait(false);
            }
            catch (OperationCanceledException)
            {
                RideLiveDiagnostics.Timer(
                    logger,
                    "cancelled_before_fire",
                    "grace",
                    rideId,
                    userId,
                    "grace_timer_cancelled",
                    graceSeconds);
                return;
            }

            if (_graceTimers.TryGetValue(key, out var current) && !ReferenceEquals(current, cts))
            {
                RideLiveDiagnostics.Skipped(
                    logger,
                    "pose_store",
                    rideId,
                    userId,
                    "grace_expiry",
                    "superseded_by_newer_timer");
                return;
            }

            RideLiveDiagnostics.Timer(
                logger,
                "fired",
                "grace",
                rideId,
                userId,
                "grace_period_elapsed",
                graceSeconds);

            RemoveRider(rideId, userId, "grace_expired");
            try
            {
                await hubContext.Clients.Group(RideLiveHub.GroupName(rideId))
                    .SendAsync("RiderLeft", new { userId })
                    .ConfigureAwait(false);
                RideLiveDiagnostics.Broadcast(
                    logger,
                    "RiderLeft",
                    rideId,
                    userId,
                    "grace_expired");
            }
            catch (Exception ex)
            {
                logger.LogWarning(
                    ex,
                    "{Tag} broadcast RiderLeft failed ride={RideId} user={UserId}",
                    RideLiveDiagnostics.Tag,
                    rideId,
                    userId);
            }
        }
        finally
        {
            ReleaseTimerIfOwned(_graceTimers, key, cts);
        }
    }

    private async Task RunStaleExpiryAsync(int rideId, int userId, int staleSeconds, CancellationTokenSource cts)
    {
        var key = (rideId, userId);
        try
        {
            try
            {
                await Task.Delay(TimeSpan.FromSeconds(staleSeconds), cts.Token).ConfigureAwait(false);
            }
            catch (OperationCanceledException)
            {
                RideLiveDiagnostics.Timer(
                    logger,
                    "cancelled_before_fire",
                    "liveness",
                    rideId,
                    userId,
                    "liveness_timer_cancelled",
                    staleSeconds);
                return;
            }

            if (_livenessTimers.TryGetValue(key, out var current) && !ReferenceEquals(current, cts))
            {
                RideLiveDiagnostics.Skipped(
                    logger,
                    "pose_store",
                    rideId,
                    userId,
                    "mark_stale",
                    "superseded_by_newer_timer");
                return;
            }

            RideLiveDiagnostics.Timer(
                logger,
                "fired",
                "liveness",
                rideId,
                userId,
                "stale_threshold_reached",
                staleSeconds);

            if (!_sessions.TryGetValue(key, out var session))
            {
                RideLiveDiagnostics.Skipped(
                    logger,
                    "pose_store",
                    rideId,
                    userId,
                    "mark_stale",
                    "session_not_found");
                return;
            }

            if (session.Presence != RiderPresence.Present)
            {
                RideLiveDiagnostics.Skipped(
                    logger,
                    "pose_store",
                    rideId,
                    userId,
                    "mark_stale",
                    "rider_not_present",
                    detail: $"presence={session.Presence}");
                return;
            }

            if (session.Liveness == PoseLiveness.Stale)
            {
                RideLiveDiagnostics.Skipped(
                    logger,
                    "pose_store",
                    rideId,
                    userId,
                    "mark_stale",
                    "already_stale");
                return;
            }

            var ageSec = (DateTime.UtcNow - session.LastPoseAtUtc).TotalSeconds;
            if (ageSec < staleSeconds - 0.5)
            {
                RideLiveDiagnostics.Skipped(
                    logger,
                    "pose_store",
                    rideId,
                    userId,
                    "mark_stale",
                    "pose_newer_than_stale_threshold",
                    detail: $"lastPoseAgeSec={ageSec:F1} thresholdSec={staleSeconds}");
                return;
            }

            var staleSession = session.WithLivenessStale();
            _sessions[key] = staleSession;

            RideLiveDiagnostics.StateTransition(
                logger,
                rideId,
                userId,
                "liveness",
                PoseLiveness.Live.ToString(),
                PoseLiveness.Stale.ToString(),
                "no_pose_within_stale_window",
                detail: $"lastPoseAgeSec={ageSec:F1} thresholdSec={staleSeconds}");

            await BroadcastStalePoseAsync(
                    rideId,
                    userId,
                    staleSession,
                    "liveness_stale",
                    $"lastPoseAgeSec={ageSec:F1}")
                .ConfigureAwait(false);
        }
        finally
        {
            ReleaseTimerIfOwned(_livenessTimers, key, cts);
        }
    }

    private async Task BroadcastStalePoseAsync(
        int rideId,
        int userId,
        RideLiveRiderSession session,
        string reason,
        string? detail = null)
    {
        var stalePose = session.ToWirePose();
        try
        {
            await hubContext.Clients.Group(RideLiveHub.GroupName(rideId))
                .SendAsync("RiderMoved", RideLiveWire.Pose(stalePose))
                .ConfigureAwait(false);
            RideLiveDiagnostics.Broadcast(
                logger,
                "RiderMoved",
                rideId,
                userId,
                reason,
                isStale: true,
                detail: detail);
        }
        catch (Exception ex)
        {
            logger.LogWarning(
                ex,
                "{Tag} broadcast stale RiderMoved failed ride={RideId} user={UserId}",
                RideLiveDiagnostics.Tag,
                rideId,
                userId);
        }
    }

    private static void CancelAndDisposeCts(CancellationTokenSource cts)
    {
        try
        {
            cts.Cancel();
        }
        catch (ObjectDisposedException)
        {
            /* ignore */
        }

        try
        {
            cts.Dispose();
        }
        catch (ObjectDisposedException)
        {
            /* ignore */
        }
    }

    /// <summary>Only removes/disposes when this CTS still owns the dictionary slot (prevents orphan timer races).</summary>
    private static void ReleaseTimerIfOwned(
        ConcurrentDictionary<(int RideId, int UserId), CancellationTokenSource> dict,
        (int RideId, int UserId) key,
        CancellationTokenSource owned)
    {
        if (dict.TryGetValue(key, out var current) && ReferenceEquals(current, owned))
            dict.TryRemove(key, out _);

        CancelAndDisposeCts(owned);
    }
}
