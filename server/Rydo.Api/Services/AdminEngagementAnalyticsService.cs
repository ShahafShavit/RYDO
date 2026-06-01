using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Rydo.Api.Data;

namespace Rydo.Api.Services;

public sealed record EngagementDeltas(double? DauWoWPct, double? WauWoWPct, double? MauMoMPct);

public sealed record EngagementSignups(int Today, int Last7Days, int Last30Days);

public sealed record DailyCount(string Date, int Count);

public sealed record ActivityHeatmapDto(
    string TimeZone,
    IReadOnlyList<string> Days,
    IReadOnlyList<int> Hours,
    int[][] Values);

public sealed record EngagementAggregatesCache(
    DateTime AsOfUtc,
    DateTime CachedUntilUtc,
    int Dau,
    int Wau,
    int Mau,
    double? StickinessPct,
    EngagementDeltas Deltas,
    EngagementSignups Signups,
    int ReturningActive30d,
    int NewActive30d,
    IReadOnlyList<DailyCount> DailyActiveUsers,
    IReadOnlyList<DailyCount> DailySignups,
    ActivityHeatmapDto ActivityHeatmap);

public sealed record EngagementAnalyticsResult(
    DateTime AsOfUtc,
    DateTime? CachedUntilUtc,
    int Dau,
    int Wau,
    int Mau,
    int ActiveNow,
    double? StickinessPct,
    EngagementDeltas Deltas,
    EngagementSignups Signups,
    int ReturningActive30d,
    int NewActive30d,
    IReadOnlyList<DailyCount> DailyActiveUsers,
    IReadOnlyList<DailyCount> DailySignups,
    ActivityHeatmapDto ActivityHeatmap);

public interface IAdminEngagementAnalyticsService
{
    Task<EngagementAnalyticsResult> GetEngagementAsync(int days, bool refresh, CancellationToken ct);

    Task<(int Dau, int Wau, int Mau, int ActiveNow, EngagementDeltas Deltas)> GetSummarySliceAsync(
        bool refresh,
        CancellationToken ct);
}

public sealed class AdminEngagementAnalyticsService(
    RydoDbContext db,
    IMemoryCache cache) : IAdminEngagementAnalyticsService
{
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan ActiveNowWindow = TimeSpan.FromMinutes(15);

    private static readonly string[] HeatmapDayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    public async Task<EngagementAnalyticsResult> GetEngagementAsync(int days, bool refresh, CancellationToken ct)
    {
        days = Math.Clamp(days, 1, 90);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var cacheKey = $"admin-engagement:{days}:{today:yyyy-MM-dd}";

        EngagementAggregatesCache aggregates;
        if (!refresh && cache.TryGetValue(cacheKey, out EngagementAggregatesCache? cached) && cached != null)
        {
            aggregates = cached;
        }
        else
        {
            aggregates = await BuildAggregatesAsync(days, today, ct);
            cache.Set(cacheKey, aggregates, CacheDuration);
        }

        var activeNow = await GetActiveNowAsync(ct);
        return new EngagementAnalyticsResult(
            aggregates.AsOfUtc,
            aggregates.CachedUntilUtc,
            aggregates.Dau,
            aggregates.Wau,
            aggregates.Mau,
            activeNow,
            aggregates.StickinessPct,
            aggregates.Deltas,
            aggregates.Signups,
            aggregates.ReturningActive30d,
            aggregates.NewActive30d,
            aggregates.DailyActiveUsers,
            aggregates.DailySignups,
            aggregates.ActivityHeatmap);
    }

    public async Task<(int Dau, int Wau, int Mau, int ActiveNow, EngagementDeltas Deltas)> GetSummarySliceAsync(
        bool refresh,
        CancellationToken ct)
    {
        var result = await GetEngagementAsync(days: 7, refresh, ct);
        return (result.Dau, result.Wau, result.Mau, result.ActiveNow, result.Deltas);
    }

    private async Task<int> GetActiveNowAsync(CancellationToken ct)
    {
        var cutoff = DateTime.UtcNow - ActiveNowWindow;
        return await db.Users.CountAsync(u => u.LastSeenAtUtc != null && u.LastSeenAtUtc >= cutoff, ct);
    }

    private async Task<EngagementAggregatesCache> BuildAggregatesAsync(int days, DateOnly today, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var windowStart = today.AddDays(-(days - 1));

        var dau = await CountDistinctUsersOnDateAsync(today, ct);
        var wau = await CountDistinctUsersInRangeAsync(today.AddDays(-6), today, ct);
        var mau = await CountDistinctUsersInRangeAsync(today.AddDays(-29), today, ct);

        var stickiness = mau > 0 ? Math.Round(dau * 100.0 / mau, 1) : (double?)null;

        var dauPriorWeekday = await CountDistinctUsersOnDateAsync(today.AddDays(-7), ct);
        var wauPrior = await CountDistinctUsersInRangeAsync(today.AddDays(-13), today.AddDays(-7), ct);
        var mauPrior = await CountDistinctUsersInRangeAsync(today.AddDays(-59), today.AddDays(-30), ct);

        var deltas = new EngagementDeltas(
            PercentChange(dau, dauPriorWeekday),
            PercentChange(wau, wauPrior),
            PercentChange(mau, mauPrior));

        var signups = await BuildSignupsAsync(today, ct);
        var (returningActive30d, newActive30d) = await BuildActiveCompositionAsync(today, ct);

        var dailyActiveUsers = await BuildDailyActiveSeriesAsync(windowStart, today, ct);
        var dailySignups = await BuildDailySignupSeriesAsync(windowStart, today, ct);
        var heatmap = await BuildHeatmapAsync(windowStart, today, ct);

        return new EngagementAggregatesCache(
            now,
            now.Add(CacheDuration),
            dau,
            wau,
            mau,
            stickiness,
            deltas,
            signups,
            returningActive30d,
            newActive30d,
            dailyActiveUsers,
            dailySignups,
            heatmap);
    }

    private async Task<int> CountDistinctUsersOnDateAsync(DateOnly date, CancellationToken ct) =>
        await db.UserActivityDays
            .AsNoTracking()
            .Where(d => d.ActivityDateUtc == date)
            .Select(d => d.UserId)
            .Distinct()
            .CountAsync(ct);

    private async Task<int> CountDistinctUsersInRangeAsync(DateOnly start, DateOnly end, CancellationToken ct) =>
        await db.UserActivityDays
            .AsNoTracking()
            .Where(d => d.ActivityDateUtc >= start && d.ActivityDateUtc <= end)
            .Select(d => d.UserId)
            .Distinct()
            .CountAsync(ct);

    private static double? PercentChange(int current, int prior)
    {
        if (prior <= 0) return null;
        return Math.Round((current - prior) * 100.0 / prior, 1);
    }

    private async Task<EngagementSignups> BuildSignupsAsync(DateOnly today, CancellationToken ct)
    {
        var todayStart = today.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var weekStart = today.AddDays(-6).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var monthStart = today.AddDays(-29).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

        var todayCount = await db.Users.CountAsync(u => u.CreatedAt >= todayStart, ct);
        var weekCount = await db.Users.CountAsync(u => u.CreatedAt >= weekStart, ct);
        var monthCount = await db.Users.CountAsync(u => u.CreatedAt >= monthStart, ct);

        return new EngagementSignups(todayCount, weekCount, monthCount);
    }

    private async Task<(int Returning, int New)> BuildActiveCompositionAsync(DateOnly today, CancellationToken ct)
    {
        var monthStart = today.AddDays(-29);
        var monthStartDt = monthStart.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

        var activeUserIds = await db.UserActivityDays
            .AsNoTracking()
            .Where(d => d.ActivityDateUtc >= monthStart && d.ActivityDateUtc <= today)
            .Select(d => d.UserId)
            .Distinct()
            .ToListAsync(ct);

        if (activeUserIds.Count == 0)
            return (0, 0);

        var createdAtByUser = await db.Users
            .AsNoTracking()
            .Where(u => activeUserIds.Contains(u.Id))
            .Select(u => new { u.Id, u.CreatedAt })
            .ToDictionaryAsync(u => u.Id, u => u.CreatedAt, ct);

        var newActive = 0;
        var returning = 0;
        foreach (var userId in activeUserIds)
        {
            if (!createdAtByUser.TryGetValue(userId, out var createdAt))
                continue;

            if (createdAt >= monthStartDt)
                newActive++;
            else
                returning++;
        }

        return (returning, newActive);
    }

    private async Task<IReadOnlyList<DailyCount>> BuildDailyActiveSeriesAsync(
        DateOnly start,
        DateOnly end,
        CancellationToken ct)
    {
        var rows = await db.UserActivityDays
            .AsNoTracking()
            .Where(d => d.ActivityDateUtc >= start && d.ActivityDateUtc <= end)
            .GroupBy(d => d.ActivityDateUtc)
            .Select(g => new { Date = g.Key, Count = g.Select(x => x.UserId).Distinct().Count() })
            .ToListAsync(ct);

        var byDate = rows.ToDictionary(r => r.Date, r => r.Count);
        return EnumerateDates(start, end)
            .Select(d => new DailyCount(d.ToString("yyyy-MM-dd"), byDate.GetValueOrDefault(d)))
            .ToList();
    }

    private async Task<IReadOnlyList<DailyCount>> BuildDailySignupSeriesAsync(
        DateOnly start,
        DateOnly end,
        CancellationToken ct)
    {
        var startDt = start.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var endExclusive = end.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

        var users = await db.Users
            .AsNoTracking()
            .Where(u => u.CreatedAt >= startDt && u.CreatedAt < endExclusive)
            .Select(u => u.CreatedAt)
            .ToListAsync(ct);

        var byDate = users
            .GroupBy(c => DateOnly.FromDateTime(c.ToUniversalTime()))
            .ToDictionary(g => g.Key, g => g.Count());

        return EnumerateDates(start, end)
            .Select(d => new DailyCount(d.ToString("yyyy-MM-dd"), byDate.GetValueOrDefault(d)))
            .ToList();
    }

    private async Task<ActivityHeatmapDto> BuildHeatmapAsync(DateOnly start, DateOnly end, CancellationToken ct)
    {
        var rows = await db.UserActivityHours
            .AsNoTracking()
            .Where(h => h.ActivityDateUtc >= start && h.ActivityDateUtc <= end)
            .Select(h => new { h.UserId, h.ActivityDateUtc, h.HourUtc })
            .ToListAsync(ct);

        var grid = new int[7][];
        for (var d = 0; d < 7; d++)
        {
            grid[d] = new int[24];
        }

        var buckets = rows
            .GroupBy(r => (DayIndex: HeatmapDayIndex(r.ActivityDateUtc), r.HourUtc))
            .Select(g => new
            {
                g.Key.DayIndex,
                g.Key.HourUtc,
                Count = g.Select(x => x.UserId).Distinct().Count(),
            });

        foreach (var bucket in buckets)
        {
            if (bucket.HourUtc < 24)
                grid[bucket.DayIndex][bucket.HourUtc] = bucket.Count;
        }

        return new ActivityHeatmapDto(
            "UTC",
            HeatmapDayLabels,
            Enumerable.Range(0, 24).ToArray(),
            grid);
    }

    private static int HeatmapDayIndex(DateOnly date) =>
        date.DayOfWeek switch
        {
            DayOfWeek.Monday => 0,
            DayOfWeek.Tuesday => 1,
            DayOfWeek.Wednesday => 2,
            DayOfWeek.Thursday => 3,
            DayOfWeek.Friday => 4,
            DayOfWeek.Saturday => 5,
            _ => 6,
        };

    private static IEnumerable<DateOnly> EnumerateDates(DateOnly start, DateOnly end)
    {
        for (var d = start; d <= end; d = d.AddDays(1))
            yield return d;
    }
}
