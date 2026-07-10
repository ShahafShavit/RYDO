using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;
using Rydo.Api.Hubs;
using Rydo.Api.Services.Hazards;

namespace Rydo.Api.Services;

public class HazardService(RydoDbContext db, IHubContext<RideLiveHub> rideLiveHub)
{
    public async Task<Dictionary<int, int>> LoadVisibleCountsByRouteIdAsync(
        IReadOnlyList<int> routeIds,
        CancellationToken ct)
    {
        if (routeIds.Count == 0)
            return new Dictionary<int, int>();

        var idSet = routeIds.Distinct().ToArray();
        var rows = await HazardVisibility.WhereVisible(db.Hazards.AsNoTracking())
            .Where(h => idSet.Contains(h.RouteId))
            .GroupBy(h => h.RouteId)
            .Select(g => new { RouteId = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        return rows.ToDictionary(x => x.RouteId, x => x.Count);
    }

    public async Task<int> CountVisibleForRouteAsync(int routeId, CancellationToken ct) =>
        await HazardVisibility.WhereVisible(db.Hazards.AsNoTracking())
            .CountAsync(h => h.RouteId == routeId, ct);

    public async Task<List<object>> ListVisibleForRouteAsync(int routeId, int? viewerUserId, CancellationToken ct)
    {
        var hazards = await HazardVisibility.WhereVisible(db.Hazards.AsNoTracking())
            .Include(h => h.ReportedBy)
            .Where(h => h.RouteId == routeId)
            .OrderByDescending(h => h.ReportedAt)
            .ToListAsync(ct);

        Dictionary<int, int>? votes = null;
        if (viewerUserId is > 0)
        {
            var ids = hazards.Select(h => h.Id).ToList();
            votes = await db.HazardVotes.AsNoTracking()
                .Where(v => v.UserId == viewerUserId.Value && ids.Contains(v.HazardId))
                .ToDictionaryAsync(v => v.HazardId, v => v.Value, ct);
        }

        return hazards
            .Select(h => HazardJsonMapper.ToClientHazard(
                h,
                votes != null && votes.TryGetValue(h.Id, out var v) ? v : null))
            .ToList();
    }

    public async Task<(HazardEntity Hazard, bool Bumped, string? Error)> CreateDuringLiveRideAsync(
        int rideId,
        int userId,
        string type,
        string? description,
        double latitude,
        double longitude,
        CancellationToken ct)
    {
        var typeNorm = type.Trim().ToLowerInvariant();
        if (!HazardConstants.AllowedTypes.Contains(typeNorm))
            return (null!, false, "Invalid hazard type.");

        var desc = (description ?? "").Trim();
        if (desc.Length > HazardConstants.DescriptionMaxLength)
            return (null!, false, $"Description must be at most {HazardConstants.DescriptionMaxLength} characters.");

        if (double.IsNaN(latitude) || double.IsNaN(longitude)
            || latitude is < -90 or > 90 || longitude is < -180 or > 180)
            return (null!, false, "Invalid coordinates.");

        var ride = await db.Rides.AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == rideId, ct);
        if (ride == null)
            return (null!, false, "Ride not found.");
        if (!RideEventWindow.LiveAvailable(ride))
            return (null!, false, "Live ride is not available.");
        if (ride.RouteId is not int routeId)
            return (null!, false, "Ride has no linked route.");

        var isParticipant = await db.RideParticipants.AsNoTracking()
            .AnyAsync(p => p.RideId == rideId && p.UserId == userId, ct);
        if (!isParticipant)
            return (null!, false, "You must be a participant to report hazards.");

        var existing = await FindNearbyDuplicateAsync(routeId, typeNorm, latitude, longitude, ct);
        if (existing != null)
        {
            existing.Score += 1;
            if (existing.Score > 0 && !HazardVisibility.IsVisible(existing))
            {
                existing.Status = HazardConstants.StatusActive;
            }
            await db.SaveChangesAsync(ct);
            await db.Entry(existing).Reference(x => x.ReportedBy).LoadAsync(ct);
            await BroadcastHazardUpdatedAsync(rideId, existing, userId, bumped: true, removed: false, ct);
            return (existing, true, null);
        }

        var routeRow = await db.Routes.AsNoTracking()
            .Where(r => r.Id == routeId)
            .Select(r => new { r.Region, r.PreviewCoordinatesJson, r.GpxBlob })
            .FirstOrDefaultAsync(ct);

        var snap = RoutePolylineProximity.Snap(
            routeRow?.PreviewCoordinatesJson,
            routeRow?.GpxBlob,
            latitude,
            longitude);

        var hazard = new HazardEntity
        {
            RouteId = routeId,
            RideId = rideId,
            Type = typeNorm,
            Description = desc,
            Latitude = latitude,
            Longitude = longitude,
            DistanceFromRouteM = snap?.DistanceFromRouteM,
            DistanceAlongRouteM = snap?.DistanceAlongRouteM,
            Region = routeRow?.Region,
            Score = HazardConstants.InitialScore,
            Status = HazardConstants.StatusActive,
            ReportedByUserId = userId,
            ReportedAt = DateTime.UtcNow,
        };
        db.Hazards.Add(hazard);
        await db.SaveChangesAsync(ct);
        await db.Entry(hazard).Reference(x => x.ReportedBy).LoadAsync(ct);
        await BroadcastHazardAddedAsync(rideId, hazard, ct);
        return (hazard, false, null);
    }

    public async Task<(HazardEntity? Hazard, int? UserVote, string? Error)> VoteAsync(
        int hazardId,
        int rideId,
        int userId,
        double latitude,
        double longitude,
        int value,
        CancellationToken ct)
    {
        if (value is not (0 or 1 or -1))
            return (null, null, "Vote value must be 1, -1, or 0.");

        if (double.IsNaN(latitude) || double.IsNaN(longitude))
            return (null, null, "Invalid coordinates.");

        var ride = await db.Rides.AsNoTracking().FirstOrDefaultAsync(r => r.Id == rideId, ct);
        if (ride == null)
            return (null, null, "Ride not found.");
        if (!RideEventWindow.LiveAvailable(ride))
            return (null, null, "Live ride is not available.");
        if (ride.RouteId is not int routeId)
            return (null, null, "Ride has no linked route.");

        var isParticipant = await db.RideParticipants.AsNoTracking()
            .AnyAsync(p => p.RideId == rideId && p.UserId == userId, ct);
        if (!isParticipant)
            return (null, null, "You must be a participant to vote.");

        var hazard = await db.Hazards
            .FirstOrDefaultAsync(h => h.Id == hazardId, ct);
        if (hazard == null)
            return (null, null, "Hazard not found.");
        if (hazard.RouteId != routeId)
            return (null, null, "Hazard is not on this ride's route.");
        if (!HazardVisibility.IsVisible(hazard))
            return (null, null, "Hazard is no longer active.");
        if (hazard.ReportedByUserId == userId)
            return (null, null, "You cannot vote on your own hazard.");

        var distM = GeoDistance.HaversineM(latitude, longitude, hazard.Latitude, hazard.Longitude);
        if (distM > HazardConstants.VoteRadiusM)
            return (null, null, "You must be within 200 m of the hazard to vote.");

        var existingVote = await db.HazardVotes
            .FirstOrDefaultAsync(v => v.HazardId == hazardId && v.UserId == userId, ct);

        var oldValue = existingVote?.Value ?? 0;
        var newValue = value;

        if (oldValue == newValue)
        {
            return (hazard, newValue == 0 ? null : newValue, null);
        }

        var delta = newValue - oldValue;
        hazard.Score += delta;

        if (existingVote == null && newValue != 0)
        {
            db.HazardVotes.Add(new HazardVote
            {
                HazardId = hazardId,
                UserId = userId,
                Value = newValue,
                UpdatedAt = DateTime.UtcNow,
            });
        }
        else if (existingVote != null && newValue == 0)
        {
            db.HazardVotes.Remove(existingVote);
        }
        else if (existingVote != null)
        {
            existingVote.Value = newValue;
            existingVote.UpdatedAt = DateTime.UtcNow;
        }

        if (hazard.Score <= 0)
            hazard.Status = HazardConstants.StatusHidden;

        await db.SaveChangesAsync(ct);

        var removed = !HazardVisibility.IsVisible(hazard);
        await BroadcastHazardUpdatedAsync(
            rideId,
            hazard,
            userId,
            bumped: false,
            removed: removed,
            ct);

        return (hazard, newValue == 0 ? null : newValue, null);
    }

    public async Task BroadcastHazardsStateAsync(int rideId, int? viewerUserId, CancellationToken ct)
    {
        var ride = await db.Rides.AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == rideId, ct);
        if (ride?.RouteId is not int routeId)
            return;

        var items = await ListVisibleForRouteAsync(routeId, viewerUserId, ct);
        await rideLiveHub.Clients.Group(RideLiveHub.GroupName(rideId))
            .SendAsync("HazardsState", new { hazards = items }, ct);
    }

    public async Task SendHazardsStateToCallerAsync(
        Microsoft.AspNetCore.SignalR.IHubCallerClients clients,
        string connectionId,
        int rideId,
        int? viewerUserId,
        CancellationToken ct)
    {
        var ride = await db.Rides.AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == rideId, ct);
        if (ride?.RouteId is not int routeId)
            return;

        var items = await ListVisibleForRouteAsync(routeId, viewerUserId, ct);
        await clients.Client(connectionId).SendAsync("HazardsState", new { hazards = items }, ct);
    }

    private async Task<HazardEntity?> FindNearbyDuplicateAsync(
        int routeId,
        string type,
        double lat,
        double lng,
        CancellationToken ct)
    {
        var candidates = await HazardVisibility.WhereVisible(db.Hazards.AsNoTracking())
            .Where(h => h.RouteId == routeId && h.Type == type)
            .ToListAsync(ct);

        foreach (var h in candidates)
        {
            if (GeoDistance.HaversineM(lat, lng, h.Latitude, h.Longitude) <= HazardConstants.DedupRadiusM)
                return await db.Hazards.FirstAsync(x => x.Id == h.Id, ct);
        }

        return null;
    }

    private async Task BroadcastHazardAddedAsync(int rideId, HazardEntity hazard, CancellationToken ct)
    {
        var dto = HazardJsonMapper.ToClientHazard(hazard);
        await rideLiveHub.Clients.Group(RideLiveHub.GroupName(rideId))
            .SendAsync("HazardAdded", dto, ct);
    }

    private async Task BroadcastHazardUpdatedAsync(
        int rideId,
        HazardEntity hazard,
        int? voterUserId,
        bool bumped,
        bool removed = false,
        CancellationToken ct = default)
    {
        var payload = HazardJsonMapper.ToHazardUpdated(hazard, null, removed);
        if (bumped)
        {
            await rideLiveHub.Clients.Group(RideLiveHub.GroupName(rideId))
                .SendAsync("HazardUpdated", new { hazard.Id, hazard.Score, hazard.Status, bumped = true, removed }, ct);
        }
        else
        {
            await rideLiveHub.Clients.Group(RideLiveHub.GroupName(rideId))
                .SendAsync("HazardUpdated", payload, ct);
        }
    }
}
