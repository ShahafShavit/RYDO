using System.Text.Json;
using Rydo.Api.Data;

namespace Rydo.Api.Services;

public static class RouteJsonMapper
{
    public static object ToClientRoute(RouteEntity r, ApplicationUser? creator, bool isSaved = false)
    {
        var warnings = JsonSerializer.Deserialize<List<string>>(r.WarningsJson) ?? new List<string>();
        var coords = JsonSerializer.Deserialize<List<List<double>>>(r.PreviewCoordinatesJson) ?? new List<List<double>>();

        return new
        {
            id = r.Id,
            title = r.Title,
            description = r.Description,
            terrain = r.Terrain,
            difficulty = r.Difficulty,
            region = r.Region,
            distanceKm = r.DistanceKm,
            elevationGainM = r.ElevationGainM,
            estimatedDurationMinutes = r.EstimatedDurationMinutes,
            durationMinutes = r.EstimatedDurationMinutes,
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
            },
            createdAt = r.CreatedAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
            isSaved,
            status = r.Status,
        };
    }
}
