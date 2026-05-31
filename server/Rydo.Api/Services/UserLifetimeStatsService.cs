using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;
using Rydo.Api.Models;

namespace Rydo.Api.Services;

public class UserLifetimeStatsService(RydoDbContext db) : IUserLifetimeStatsService
{
    public async Task<UserLifetimeStatsDto> GetAsync(int userId, CancellationToken ct = default)
    {
        var row = await (
                from h in db.HistoryEntries.AsNoTracking()
                join r in db.Routes.AsNoTracking() on h.RouteId equals r.Id
                where h.UserId == userId
                group new { h, r } by h.UserId
                into g
                select new
                {
                    TotalKm = g.Sum(x => x.h.DistanceKm ?? x.r.DistanceKm),
                    TotalElevationGainM = g.Sum(x => x.h.ElevationGainM ?? x.r.ElevationGainM),
                    CompletedRides = g.Count(),
                })
            .FirstOrDefaultAsync(ct);

        if (row == null)
            return new UserLifetimeStatsDto(0, 0, 0);

        return new UserLifetimeStatsDto(row.TotalKm, row.TotalElevationGainM, row.CompletedRides);
    }
}
