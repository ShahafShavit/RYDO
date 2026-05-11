using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;

namespace Rydo.Api.Services.RideLive;

/// <summary>In-memory last-known poses per ride for join snapshots.</summary>
public sealed class RideLivePoseStore(ILogger<RideLivePoseStore> logger)
{
    private readonly ConcurrentDictionary<int, ConcurrentDictionary<int, RiderPoseDto>> _byRide = new();

    public void SetPose(int rideId, RiderPoseDto dto)
    {
        var inner = _byRide.GetOrAdd(rideId, _ => new ConcurrentDictionary<int, RiderPoseDto>());
        inner[dto.UserId] = dto;
        logger.LogDebug(
            "Ride live pose store: set ride {RideId} user {UserId} lat {Lat:F6} lng {Lng:F6}",
            rideId,
            dto.UserId,
            dto.Lat,
            dto.Lng);
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
        if (_byRide.TryGetValue(rideId, out var inner) && inner.TryRemove(userId, out _))
            logger.LogDebug("Ride live pose store: removed ride {RideId} user {UserId}", rideId, userId);
    }
}
