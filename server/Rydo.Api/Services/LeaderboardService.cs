using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;
using Rydo.Api.Models;

namespace Rydo.Api.Services;

public class LeaderboardService(RydoDbContext db) : ILeaderboardService
{
    public const int DefaultTopN = 5;

    public const string BoardHorizonChasers = "horizonChasers";
    public const string BoardSaddleJunkies = "saddleJunkies";
    public const string BoardSummitSeekers = "summitSeekers";
    public const string BoardTrailblazers = "trailblazers";

    public async Task<LeaderboardsResponseDto> GetSummariesAsync(int topN, CancellationToken ct)
    {
        var distanceRanks = await (
                from h in db.HistoryEntries.AsNoTracking()
                join r in db.Routes.AsNoTracking() on h.RouteId equals r.Id
                group new { h, r } by h.UserId
                into g
                select new
                {
                    UserId = g.Key,
                    TotalKm = g.Sum(x => x.h.DistanceKm ?? x.r.DistanceKm),
                })
            .OrderByDescending(x => x.TotalKm)
            .ThenBy(x => x.UserId)
            .Take(topN)
            .ToListAsync(ct);

        var rideRanks = await db.HistoryEntries.AsNoTracking()
            .GroupBy(h => h.UserId)
            .Select(g => new { UserId = g.Key, Cnt = g.Count() })
            .OrderByDescending(x => x.Cnt)
            .ThenBy(x => x.UserId)
            .Take(topN)
            .ToListAsync(ct);

        var elevationRanks = await (
                from h in db.HistoryEntries.AsNoTracking()
                join r in db.Routes.AsNoTracking() on h.RouteId equals r.Id
                group new { h, r } by h.UserId
                into g
                select new
                {
                    UserId = g.Key,
                    TotalM = g.Sum(x => x.h.ElevationGainM ?? x.r.ElevationGainM),
                })
            .OrderByDescending(x => x.TotalM)
            .ThenBy(x => x.UserId)
            .Take(topN)
            .ToListAsync(ct);

        var publishedRouteRanks = await db.Routes.AsNoTracking()
            .Where(r => r.Status == "published")
            .GroupBy(r => r.CreatedByUserId)
            .Select(g => new { UserId = g.Key, Cnt = g.Count() })
            .OrderByDescending(x => x.Cnt)
            .ThenBy(x => x.UserId)
            .Take(topN)
            .ToListAsync(ct);

        var allIds = distanceRanks.Select(x => x.UserId)
            .Concat(rideRanks.Select(x => x.UserId))
            .Concat(elevationRanks.Select(x => x.UserId))
            .Concat(publishedRouteRanks.Select(x => x.UserId))
            .Distinct()
            .ToList();

        var users = await db.Users.AsNoTracking()
            .Where(u => allIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, ct);

        return new LeaderboardsResponseDto(
            Map(distanceRanks.Select(x => (x.UserId, x.TotalKm)).ToList(), "km", users),
            Map(rideRanks.Select(x => (x.UserId, (double)x.Cnt)).ToList(), "rides", users),
            Map(elevationRanks.Select(x => (x.UserId, x.TotalM)).ToList(), "m", users),
            Map(publishedRouteRanks.Select(x => (x.UserId, (double)x.Cnt)).ToList(), "routes", users));
    }

    public async Task<IReadOnlyList<LeaderboardBadgeDto>> GetUserTopThreeBadgesAsync(int userId, CancellationToken ct)
    {
        var badges = new List<LeaderboardBadgeDto>();

        if (await db.HistoryEntries.AsNoTracking().AnyAsync(h => h.UserId == userId, ct))
        {
            var myKm = await (
                    from h in db.HistoryEntries.AsNoTracking()
                    join r in db.Routes.AsNoTracking() on h.RouteId equals r.Id
                    where h.UserId == userId
                    select (double?)(h.DistanceKm ?? r.DistanceKm))
                .SumAsync(ct) ?? 0d;

            var betterKm = await (
                    from h in db.HistoryEntries.AsNoTracking()
                    join r in db.Routes.AsNoTracking() on h.RouteId equals r.Id
                    group new { h, r } by h.UserId
                    into g
                    select new
                    {
                        UserId = g.Key,
                        TotalKm = g.Sum(x => x.h.DistanceKm ?? x.r.DistanceKm),
                    })
                .Where(x => x.TotalKm > myKm || (x.TotalKm == myKm && x.UserId < userId))
                .CountAsync(ct);
            var rankKm = betterKm + 1;
            if (rankKm <= 3)
                badges.Add(new LeaderboardBadgeDto(BoardHorizonChasers, rankKm));

            var myRides = await db.HistoryEntries.AsNoTracking().CountAsync(h => h.UserId == userId, ct);
            var betterRides = await db.HistoryEntries.AsNoTracking()
                .GroupBy(h => h.UserId)
                .Select(g => new { UserId = g.Key, Cnt = g.Count() })
                .Where(x => x.Cnt > myRides || (x.Cnt == myRides && x.UserId < userId))
                .CountAsync(ct);
            var rankRides = betterRides + 1;
            if (rankRides <= 3)
                badges.Add(new LeaderboardBadgeDto(BoardSaddleJunkies, rankRides));

            var myElev = await (
                    from h in db.HistoryEntries.AsNoTracking()
                    join r in db.Routes.AsNoTracking() on h.RouteId equals r.Id
                    where h.UserId == userId
                    select (double?)(h.ElevationGainM ?? r.ElevationGainM))
                .SumAsync(ct) ?? 0d;

            var betterElev = await (
                    from h in db.HistoryEntries.AsNoTracking()
                    join r in db.Routes.AsNoTracking() on h.RouteId equals r.Id
                    group new { h, r } by h.UserId
                    into g
                    select new
                    {
                        UserId = g.Key,
                        TotalM = g.Sum(x => x.h.ElevationGainM ?? x.r.ElevationGainM),
                    })
                .Where(x => x.TotalM > myElev || (x.TotalM == myElev && x.UserId < userId))
                .CountAsync(ct);
            var rankElev = betterElev + 1;
            if (rankElev <= 3)
                badges.Add(new LeaderboardBadgeDto(BoardSummitSeekers, rankElev));
        }

        var myPublished = await db.Routes.AsNoTracking()
            .CountAsync(r => r.Status == "published" && r.CreatedByUserId == userId, ct);
        if (myPublished > 0)
        {
            var betterPub = await db.Routes.AsNoTracking()
                .Where(r => r.Status == "published")
                .GroupBy(r => r.CreatedByUserId)
                .Select(g => new { UserId = g.Key, Cnt = g.Count() })
                .Where(x => x.Cnt > myPublished || (x.Cnt == myPublished && x.UserId < userId))
                .CountAsync(ct);
            var rankPub = betterPub + 1;
            if (rankPub <= 3)
                badges.Add(new LeaderboardBadgeDto(BoardTrailblazers, rankPub));
        }

        return badges;
    }

    private static List<LeaderboardRowDto> Map(
        IReadOnlyList<(int UserId, double Value)> rows,
        string unit,
        IReadOnlyDictionary<int, ApplicationUser> users)
    {
        var list = new List<LeaderboardRowDto>(rows.Count);
        for (var i = 0; i < rows.Count; i++)
        {
            var (uid, val) = rows[i];
            users.TryGetValue(uid, out var u);
            var displayName = u != null ? $"{u.FirstName} {u.LastName}".Trim() : "";
            if (string.IsNullOrEmpty(displayName))
                displayName = $"User #{uid}";

            var avatar = AvatarUrls.ResolveUserDisplay(u);
            list.Add(new LeaderboardRowDto(i + 1, uid, displayName, avatar, val, unit));
        }

        return list;
    }
}
