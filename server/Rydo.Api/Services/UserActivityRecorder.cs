using System.Collections.Concurrent;
using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;

namespace Rydo.Api.Services;

public interface IUserActivityRecorder
{
    void Record(int userId, DateTime utcNow);
}

/// <summary>Records authenticated app-open activity into daily/hourly rollups.</summary>
public sealed class UserActivityRecorder(IServiceScopeFactory scopeFactory) : IUserActivityRecorder
{
    private static readonly TimeSpan ThrottleInterval = TimeSpan.FromMinutes(5);
    private readonly ConcurrentDictionary<int, DateTime> _lastRecordedUtc = new();

    public void Record(int userId, DateTime utcNow)
    {
        if (userId <= 0) return;

        if (_lastRecordedUtc.TryGetValue(userId, out var last) && utcNow - last < ThrottleInterval)
            return;

        _lastRecordedUtc[userId] = utcNow;

        _ = Task.Run(async () =>
        {
            try
            {
                await PersistAsync(userId, utcNow, CancellationToken.None);
            }
            catch
            {
                _lastRecordedUtc.TryRemove(userId, out _);
            }
        });
    }

    private async Task PersistAsync(int userId, DateTime utcNow, CancellationToken ct)
    {
        var activityDate = DateOnly.FromDateTime(utcNow);
        var hourUtc = (byte)utcNow.Hour;

        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RydoDbContext>();

        var day = await db.UserActivityDays
            .FirstOrDefaultAsync(d => d.UserId == userId && d.ActivityDateUtc == activityDate, ct);

        if (day == null)
        {
            db.UserActivityDays.Add(new UserActivityDay
            {
                UserId = userId,
                ActivityDateUtc = activityDate,
                FirstSeenAtUtc = utcNow,
                LastSeenAtUtc = utcNow,
            });
        }
        else
        {
            day.LastSeenAtUtc = utcNow;
        }

        var hourExists = await db.UserActivityHours.AnyAsync(
            h => h.UserId == userId && h.ActivityDateUtc == activityDate && h.HourUtc == hourUtc,
            ct);

        if (!hourExists)
        {
            db.UserActivityHours.Add(new UserActivityHour
            {
                UserId = userId,
                ActivityDateUtc = activityDate,
                HourUtc = hourUtc,
            });
        }

        await db.Users
            .Where(u => u.Id == userId)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.LastSeenAtUtc, utcNow), ct);

        await db.SaveChangesAsync(ct);
    }
}
