using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;

namespace Rydo.Api.Controllers;

[ApiController]
[Route("api/leaderboards")]
[Authorize]
public class LeaderboardsController(RydoDbContext db) : ControllerBase
{
    private const int TopN = 5;

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
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
            .Take(TopN)
            .ToListAsync(ct);

        var rideRanks = await db.HistoryEntries.AsNoTracking()
            .GroupBy(h => h.UserId)
            .Select(g => new { UserId = g.Key, Cnt = g.Count() })
            .OrderByDescending(x => x.Cnt)
            .ThenBy(x => x.UserId)
            .Take(TopN)
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
            .Take(TopN)
            .ToListAsync(ct);

        var publishedRouteRanks = await db.Routes.AsNoTracking()
            .Where(r => r.Status == "published")
            .GroupBy(r => r.CreatedByUserId)
            .Select(g => new { UserId = g.Key, Cnt = g.Count() })
            .OrderByDescending(x => x.Cnt)
            .ThenBy(x => x.UserId)
            .Take(TopN)
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

        return Ok(new
        {
            horizonChasers = Map(
                distanceRanks.Select(x => (x.UserId, x.TotalKm)).ToList(),
                "km",
                users),
            saddleJunkies = Map(
                rideRanks.Select(x => (x.UserId, (double)x.Cnt)).ToList(),
                "rides",
                users),
            summitSeekers = Map(
                elevationRanks.Select(x => (x.UserId, x.TotalM)).ToList(),
                "m",
                users),
            trailblazers = Map(
                publishedRouteRanks.Select(x => (x.UserId, (double)x.Cnt)).ToList(),
                "routes",
                users),
        });
    }

    private static object[] Map(
        IReadOnlyList<(int UserId, double Value)> rows,
        string unit,
        IReadOnlyDictionary<int, ApplicationUser> users)
    {
        var list = new object[rows.Count];
        for (var i = 0; i < rows.Count; i++)
        {
            var (uid, val) = rows[i];
            users.TryGetValue(uid, out var u);
            var displayName = u != null ? $"{u.FirstName} {u.LastName}".Trim() : "";
            if (string.IsNullOrEmpty(displayName))
                displayName = $"User #{uid}";

            list[i] = new
            {
                rank = i + 1,
                userId = uid,
                displayName,
                avatarUrl = string.IsNullOrWhiteSpace(u?.AvatarUrl) ? null : u!.AvatarUrl!.Trim(),
                value = val,
                unit,
            };
        }

        return list;
    }
}
