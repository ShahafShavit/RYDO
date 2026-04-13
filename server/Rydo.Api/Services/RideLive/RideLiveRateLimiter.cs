namespace Rydo.Api.Services.RideLive;

public sealed class RideLiveRateLimiter
{
    private readonly object _lock = new();
    private readonly Dictionary<(int RideId, int UserId), DateTime> _last = new();

    public bool TryAllow(int rideId, int userId, int minIntervalMs, DateTime utcNow)
    {
        var key = (rideId, userId);
        lock (_lock)
        {
            if (_last.TryGetValue(key, out var prev))
            {
                var delta = (utcNow - prev).TotalMilliseconds;
                if (delta < minIntervalMs)
                    return false;
            }

            _last[key] = utcNow;
            return true;
        }
    }
}
