using System.Collections.Concurrent;

namespace Rydo.Api.Services.RideLive;

/// <summary>In-memory last-known poses per ride for join snapshots.</summary>
public sealed class RideLivePoseStore
{
    private readonly ConcurrentDictionary<int, ConcurrentDictionary<int, RiderPoseDto>> _byRide = new();

    public void SetPose(int rideId, RiderPoseDto dto)
    {
        var inner = _byRide.GetOrAdd(rideId, _ => new ConcurrentDictionary<int, RiderPoseDto>());
        inner[dto.UserId] = dto;
    }

    public IReadOnlyList<RiderPoseDto> GetSnapshot(int rideId) =>
        _byRide.TryGetValue(rideId, out var inner)
            ? inner.Values.ToList()
            : [];

    public void RemoveRider(int rideId, int userId)
    {
        if (_byRide.TryGetValue(rideId, out var inner))
            inner.TryRemove(userId, out _);
    }
}
