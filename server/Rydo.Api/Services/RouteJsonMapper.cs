using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;

namespace Rydo.Api.Services;

public readonly record struct RouteRiderVisible(int UserId, string FullName, string? AvatarUrl);

public readonly record struct RouteRidersInfo(int TotalCount, IReadOnlyList<RouteRiderVisible> Visible);

public static class RouteJsonMapper
{
    /// <summary>Distinct participants on past rides that used this route; names filtered by <see cref="UserPreference.PublicInRouteRiderLists"/>.</summary>
    public static async Task<RouteRidersInfo> LoadRouteRidersInfoAsync(RydoDbContext db, int routeId, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var pastRideIds = await db.Rides.AsNoTracking()
            .Where(g => g.Kind != RideKind.SoloLog && g.RouteId == routeId && g.ScheduledDate < now)
            .Select(g => g.Id)
            .ToListAsync(ct);
        if (pastRideIds.Count == 0)
            return new RouteRidersInfo(0, Array.Empty<RouteRiderVisible>());

        var riderIds = await db.RideParticipants.AsNoTracking()
            .Where(p => pastRideIds.Contains(p.RideId))
            .Select(p => p.UserId)
            .Distinct()
            .ToListAsync(ct);
        var total = riderIds.Count;
        if (total == 0)
            return new RouteRidersInfo(0, Array.Empty<RouteRiderVisible>());

        var prefs = await db.UserPreferences.AsNoTracking()
            .Where(p => riderIds.Contains(p.UserId))
            .ToDictionaryAsync(p => p.UserId, p => p.PublicInRouteRiderLists, ct);

        var visibleIds = riderIds.Where(id => !prefs.TryGetValue(id, out var pub) || pub).ToList();

        var users = await db.Users.AsNoTracking()
            .Where(u => visibleIds.Contains(u.Id))
            .OrderBy(u => u.FirstName)
            .ThenBy(u => u.LastName)
            .ToListAsync(ct);

        var visible = users
            .Select(u => new RouteRiderVisible(
                u.Id,
                $"{u.FirstName} {u.LastName}".Trim(),
                UserPublicFields.RosterAvatarUrl(u)))
            .ToList();

        return new RouteRidersInfo(total, visible);
    }

    public static object ToClientRoute(RouteEntity r, ApplicationUser? creator, bool isSaved = false, RouteRidersInfo? routeRiders = null, double? distanceFromUserKm = null)
    {
        var warnings = JsonSerializer.Deserialize<List<string>>(r.WarningsJson) ?? new List<string>();
        var coords = JsonSerializer.Deserialize<List<List<double>>>(r.PreviewCoordinatesJson) ?? new List<List<double>>();

        var rr = routeRiders ?? new RouteRidersInfo(0, Array.Empty<RouteRiderVisible>());

        return new
        {
            id = r.Id,
            title = r.Title,
            description = r.Description,
            terrain = r.Terrain,
            difficulty = r.Difficulty,
            region = r.Region,
            distanceFromUserKm,
            distanceKm = r.DistanceKm,
            elevationGainM = r.ElevationGainM,
            estimatedDurationMinutes = r.EstimatedDurationMinutes,
            durationMinutes = r.EstimatedDurationMinutes,
            estimatedDurationSource = r.EstimatedDurationSource,
            warnings,
            notes = r.Notes,
            gpx = new
            {
                fileUrl = (string?)null,
                reference = r.GpxReference ?? $"routes/{r.Id}.gpx",
            },
            preview = new
            {
                geoJson = (object?)null,
                coordinates = coords,
            },
            createdBy = new
            {
                id = creator?.Id ?? r.CreatedByUserId,
                fullName = creator != null ? $"{creator.FirstName} {creator.LastName}".Trim() : "Unknown",
                avatarUrl = UserPublicFields.RosterAvatarUrl(creator),
            },
            createdAt = r.CreatedAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
            isSaved,
            status = r.Status,
            routeRiders = new
            {
                totalCount = rr.TotalCount,
                visibleRiders = rr.Visible.Select(v => new { userId = v.UserId, fullName = v.FullName, avatarUrl = v.AvatarUrl }).ToList(),
            },
        };
    }
}
