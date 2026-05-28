using System.Collections.Concurrent;
using Microsoft.AspNetCore.SignalR;
using Rydo.Api.Hubs;

namespace Rydo.Api.Services.RideLive;

/// <summary>In-memory last-known poses per ride for join snapshots.</summary>
public sealed class RideLivePoseStore(
    IHubContext<RideLiveHub> hubContext,
    ILogger<RideLivePoseStore> logger)
{
    public const int DefaultDisconnectGraceSeconds = 45;
    public const int DefaultPoseStaleSeconds = 25;
    public const int StaleRecoveryMinPoses = 2;
    public const int StaleRecoveryGraceSeconds = 5;

    private readonly ConcurrentDictionary<int, ConcurrentDictionary<int, RiderPoseDto>> _byRide = new();
    private readonly ConcurrentDictionary<(int RideId, int UserId), CancellationTokenSource> _pendingRemovals = new();
    private readonly ConcurrentDictionary<(int RideId, int UserId), CancellationTokenSource> _pendingStaleChecks = new();
    private readonly ConcurrentDictionary<(int RideId, int UserId), CancellationTokenSource> _pendingRecoveryClears = new();
    private readonly ConcurrentDictionary<(int RideId, int UserId), int> _staleRecoveryPoseCount = new();

    /// <summary>Stores pose and returns the wire state (may remain stale during recovery hysteresis).</summary>
    public RiderPoseDto SetPose(int rideId, RiderPoseDto dto)
    {
        CancelScheduledRemoval(rideId, dto.UserId);

        var inner = _byRide.GetOrAdd(rideId, _ => new ConcurrentDictionary<int, RiderPoseDto>());
        var wasStale = inner.TryGetValue(dto.UserId, out var existing) && existing.IsStale;

        if (wasStale)
        {
            var count = _staleRecoveryPoseCount.AddOrUpdate((rideId, dto.UserId), 1, (_, c) => c + 1);
            var recovering = dto with { IsStale = true };
            inner[dto.UserId] = recovering;
            ScheduleStaleCheck(rideId, dto.UserId);

            if (count >= StaleRecoveryMinPoses)
            {
                var fresh = ClearStaleRecovery(rideId, dto.UserId, inner, dto);
                ScheduleStaleCheck(rideId, dto.UserId);
                logger.LogDebug(
                    "Ride live pose store: recovery ({Count} poses) — fresh ride {RideId} user {UserId}",
                    count,
                    rideId,
                    dto.UserId);
                return fresh;
            }

            if (count == 1)
                ScheduleRecoveryClear(rideId, dto.UserId);

            logger.LogDebug(
                "Ride live pose store: recovery pose {Count}/{Min} ride {RideId} user {UserId} (still stale)",
                count,
                StaleRecoveryMinPoses,
                rideId,
                dto.UserId);
            return recovering;
        }

        CancelRecoveryClear(rideId, dto.UserId);
        _staleRecoveryPoseCount.TryRemove((rideId, dto.UserId), out _);

        CancelScheduledStaleCheck(rideId, dto.UserId);
        var freshPose = dto with { IsStale = false };
        inner[dto.UserId] = freshPose;
        ScheduleStaleCheck(rideId, dto.UserId);

        logger.LogDebug(
            "Ride live pose store: set ride {RideId} user {UserId} lat {Lat:F6} lng {Lng:F6}",
            rideId,
            dto.UserId,
            dto.Lat,
            dto.Lng);
        return freshPose;
    }

    private RiderPoseDto ClearStaleRecovery(
        int rideId,
        int userId,
        ConcurrentDictionary<int, RiderPoseDto> inner,
        RiderPoseDto latest)
    {
        CancelRecoveryClear(rideId, userId);
        _staleRecoveryPoseCount.TryRemove((rideId, userId), out _);
        var fresh = latest with { IsStale = false };
        inner[userId] = fresh;
        return fresh;
    }

    /// <summary>Cancels pending removal when a rider re-joins or updates pose before grace expires.</summary>
    public void CancelScheduledRemoval(int rideId, int userId)
    {
        if (_pendingRemovals.TryRemove((rideId, userId), out var cts))
        {
            try
            {
                cts.Cancel();
            }
            catch (ObjectDisposedException)
            {
                /* ignore */
            }

            cts.Dispose();
            logger.LogDebug(
                "Ride live pose store: cancelled scheduled removal ride {RideId} user {UserId}",
                rideId,
                userId);
        }
    }

    /// <summary>Schedules pose removal and <c>RiderLeft</c> broadcast after a brief disconnect grace period.</summary>
    public void ScheduleRiderRemoval(int rideId, int userId, int graceSeconds = DefaultDisconnectGraceSeconds)
    {
        CancelScheduledRemoval(rideId, userId);
        CancelScheduledStaleCheck(rideId, userId);
        CancelRecoveryClear(rideId, userId);
        _staleRecoveryPoseCount.TryRemove((rideId, userId), out _);

        var cts = new CancellationTokenSource();
        if (!_pendingRemovals.TryAdd((rideId, userId), cts))
        {
            cts.Dispose();
            return;
        }

        logger.LogDebug(
            "Ride live pose store: scheduled removal in {GraceSeconds}s ride {RideId} user {UserId}",
            graceSeconds,
            rideId,
            userId);

        _ = RunGraceExpiryAsync(rideId, userId, graceSeconds, cts);
    }

    private async Task RunGraceExpiryAsync(int rideId, int userId, int graceSeconds, CancellationTokenSource cts)
    {
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(graceSeconds), cts.Token).ConfigureAwait(false);
        }
        catch (OperationCanceledException)
        {
            return;
        }
        finally
        {
            _pendingRemovals.TryRemove((rideId, userId), out _);
            cts.Dispose();
        }

        RemoveRider(rideId, userId);
        try
        {
            await hubContext.Clients.Group(RideLiveHub.GroupName(rideId))
                .SendAsync("RiderLeft", new { userId })
                .ConfigureAwait(false);
            logger.LogDebug(
                "Ride live pose store: grace expired — RiderLeft broadcast ride {RideId} user {UserId}",
                rideId,
                userId);
        }
        catch (Exception ex)
        {
            logger.LogDebug(ex, "Ride live pose store: RiderLeft broadcast failed after grace");
        }
    }

    public bool TryGetPose(int rideId, int userId, out RiderPoseDto dto)
    {
        if (_byRide.TryGetValue(rideId, out var inner) && inner.TryGetValue(userId, out var pose))
        {
            dto = pose;
            return true;
        }

        dto = default!;
        return false;
    }

    public IReadOnlyList<RiderPoseDto> GetSnapshot(int rideId)
    {
        if (!_byRide.TryGetValue(rideId, out var inner))
        {
            logger.LogDebug("Ride live pose store: snapshot ride {RideId} → 0 riders (no bucket)", rideId);
            return [];
        }

        var list = inner.Values.ToList();
        logger.LogDebug("Ride live pose store: snapshot ride {RideId} → {Count} rider(s)", rideId, list.Count);
        return list;
    }

    public void RemoveRider(int rideId, int userId)
    {
        CancelScheduledStaleCheck(rideId, userId);
        CancelRecoveryClear(rideId, userId);
        _staleRecoveryPoseCount.TryRemove((rideId, userId), out _);
        if (_byRide.TryGetValue(rideId, out var inner) && inner.TryRemove(userId, out _))
            logger.LogDebug("Ride live pose store: removed ride {RideId} user {UserId}", rideId, userId);
    }

    private void CancelScheduledStaleCheck(int rideId, int userId)
    {
        if (_pendingStaleChecks.TryRemove((rideId, userId), out var cts))
        {
            try
            {
                cts.Cancel();
            }
            catch (ObjectDisposedException)
            {
                /* ignore */
            }

            cts.Dispose();
            logger.LogDebug(
                "Ride live pose store: cancelled stale check ride {RideId} user {UserId}",
                rideId,
                userId);
        }
    }

    private void CancelRecoveryClear(int rideId, int userId)
    {
        if (_pendingRecoveryClears.TryRemove((rideId, userId), out var cts))
        {
            try
            {
                cts.Cancel();
            }
            catch (ObjectDisposedException)
            {
                /* ignore */
            }

            cts.Dispose();
        }
    }

    private void ScheduleStaleCheck(int rideId, int userId, int staleSeconds = DefaultPoseStaleSeconds)
    {
        CancelScheduledStaleCheck(rideId, userId);

        var cts = new CancellationTokenSource();
        if (!_pendingStaleChecks.TryAdd((rideId, userId), cts))
        {
            cts.Dispose();
            return;
        }

        logger.LogDebug(
            "Ride live pose store: scheduled stale check in {StaleSeconds}s ride {RideId} user {UserId}",
            staleSeconds,
            rideId,
            userId);

        _ = RunStaleExpiryAsync(rideId, userId, staleSeconds, cts);
    }

    private void ScheduleRecoveryClear(int rideId, int userId, int graceSeconds = StaleRecoveryGraceSeconds)
    {
        CancelRecoveryClear(rideId, userId);

        var cts = new CancellationTokenSource();
        if (!_pendingRecoveryClears.TryAdd((rideId, userId), cts))
        {
            cts.Dispose();
            return;
        }

        _ = RunRecoveryClearAsync(rideId, userId, graceSeconds, cts);
    }

    private async Task RunRecoveryClearAsync(int rideId, int userId, int graceSeconds, CancellationTokenSource cts)
    {
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(graceSeconds), cts.Token).ConfigureAwait(false);
        }
        catch (OperationCanceledException)
        {
            return;
        }
        finally
        {
            _pendingRecoveryClears.TryRemove((rideId, userId), out _);
            cts.Dispose();
        }

        if (!_byRide.TryGetValue(rideId, out var inner) || !inner.TryGetValue(userId, out var pose) || !pose.IsStale)
            return;

        if (!_staleRecoveryPoseCount.TryGetValue((rideId, userId), out var count) || count < 1)
            return;

        var fresh = ClearStaleRecovery(rideId, userId, inner, pose);
        ScheduleStaleCheck(rideId, userId);
        try
        {
            await hubContext.Clients.Group(RideLiveHub.GroupName(rideId))
                .SendAsync("RiderMoved", RideLiveWire.Pose(fresh))
                .ConfigureAwait(false);
            logger.LogDebug(
                "Ride live pose store: recovery grace ({GraceSeconds}s) — fresh broadcast ride {RideId} user {UserId}",
                graceSeconds,
                rideId,
                userId);
        }
        catch (Exception ex)
        {
            logger.LogDebug(ex, "Ride live pose store: recovery fresh broadcast failed");
        }
    }

    private async Task RunStaleExpiryAsync(int rideId, int userId, int staleSeconds, CancellationTokenSource cts)
    {
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(staleSeconds), cts.Token).ConfigureAwait(false);
        }
        catch (OperationCanceledException)
        {
            return;
        }
        finally
        {
            _pendingStaleChecks.TryRemove((rideId, userId), out _);
            cts.Dispose();
        }

        if (!_byRide.TryGetValue(rideId, out var inner) || !inner.TryGetValue(userId, out var pose))
            return;

        if (pose.IsStale)
            return;

        CancelRecoveryClear(rideId, userId);
        _staleRecoveryPoseCount.TryRemove((rideId, userId), out _);

        var stalePose = pose with { IsStale = true };
        inner[userId] = stalePose;

        try
        {
            await hubContext.Clients.Group(RideLiveHub.GroupName(rideId))
                .SendAsync("RiderMoved", RideLiveWire.Pose(stalePose))
                .ConfigureAwait(false);
            logger.LogDebug(
                "Ride live pose store: pose stale — RiderMoved broadcast ride {RideId} user {UserId}",
                rideId,
                userId);
        }
        catch (Exception ex)
        {
            logger.LogDebug(ex, "Ride live pose store: stale RiderMoved broadcast failed");
        }
    }
}
