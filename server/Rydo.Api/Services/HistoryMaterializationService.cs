using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;

namespace Rydo.Api.Services;

public interface IHistoryMaterializationService
{
    Task<bool> TryMaterializeRideForUserAsync(int userId, int rideId, CancellationToken ct = default);
    Task MaterializeEligibleForUserAsync(int userId, CancellationToken ct = default);
    Task<int> MaterializeEligibleForAllAsync(CancellationToken ct = default);
}

public sealed class HistoryMaterializationService(
    RydoDbContext db,
    IGamificationService gamification) : IHistoryMaterializationService
{
    public async Task<bool> TryMaterializeRideForUserAsync(int userId, int rideId, CancellationToken ct = default)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        try
        {
            var ride = await db.Rides
                .Include(r => r.Route)
                .FirstOrDefaultAsync(r => r.Id == rideId, ct);
            if (ride == null) return false;
            if (ride.Kind == RideKind.SoloLog || ride.RouteId == null) return false;
            if (DateTime.UtcNow < RideEventWindow.ClosesAt(ride)) return false;

            var isParticipant = await db.RideParticipants
                .AnyAsync(p => p.RideId == rideId && p.UserId == userId, ct);
            if (!isParticipant) return false;

            if (await db.HistoryEntries.AnyAsync(h => h.UserId == userId && h.RideId == rideId, ct))
                return false;

            var route = ride.Route ?? await db.Routes.AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == ride.RouteId, ct);
            if (route == null) return false;

            var participantCount = await db.RideParticipants.CountAsync(p => p.RideId == rideId, ct);
            var entry = new HistoryEntry
            {
                UserId = userId,
                RouteId = route.Id,
                RouteTitle = route.Title,
                CompletedAt = ride.ScheduledDate,
                DurationMinutes = route.EstimatedDurationMinutes,
                DistanceKm = route.DistanceKm,
                ElevationGainM = route.ElevationGainM,
                RideId = rideId,
                MaterializedAt = DateTime.UtcNow,
                HistorySource = HistorySourceKind.Materialized,
            };
            db.HistoryEntries.Add(entry);
            await db.SaveChangesAsync(ct);
            await gamification.OnHistoryMaterializedAsync(entry, participantCount, ride.ClubId != null, ct);
            await tx.CommitAsync(ct);
            return true;
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }
    }

    public async Task MaterializeEligibleForUserAsync(int userId, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var rideIds = await (
            from p in db.RideParticipants.AsNoTracking()
            join r in db.Rides.AsNoTracking() on p.RideId equals r.Id
            where p.UserId == userId
                  && r.Kind != RideKind.SoloLog
                  && r.RouteId != null
            select new { r.Id, r.ScheduledDate }
        ).ToListAsync(ct);

        foreach (var row in rideIds)
        {
            var closesAt = row.ScheduledDate.ToUniversalTime().AddHours(RideEventWindow.HoursAfterStart);
            if (now < closesAt) continue;
            await TryMaterializeRideForUserAsync(userId, row.Id, ct);
        }
    }

    public async Task<int> MaterializeEligibleForAllAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var pairs = await (
            from p in db.RideParticipants.AsNoTracking()
            join r in db.Rides.AsNoTracking() on p.RideId equals r.Id
            where r.Kind != RideKind.SoloLog
                  && r.RouteId != null
            let closesAt = r.ScheduledDate
            where closesAt != default
            select new { p.UserId, p.RideId, r.ScheduledDate }
        ).ToListAsync(ct);

        var count = 0;
        foreach (var row in pairs)
        {
            var closesAt = row.ScheduledDate.ToUniversalTime().AddHours(RideEventWindow.HoursAfterStart);
            if (now < closesAt) continue;
            if (await TryMaterializeRideForUserAsync(row.UserId, row.RideId, ct))
                count++;
        }
        return count;
    }
}
