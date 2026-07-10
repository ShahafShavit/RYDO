using Rydo.Api.Data;

namespace Rydo.Api.Services.Hazards;

public static class HazardJsonMapper
{
    public static object ToClientHazard(HazardEntity h, int? userVote = null, bool bumped = false) => new
    {
        id = h.Id,
        routeId = h.RouteId,
        rideId = h.RideId,
        type = h.Type,
        description = h.Description,
        score = h.Score,
        status = h.Status,
        distanceFromRouteM = h.DistanceFromRouteM,
        distanceAlongRouteM = h.DistanceAlongRouteM,
        location = new { lat = h.Latitude, lng = h.Longitude, region = h.Region },
        reportedAt = h.ReportedAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
        reportedBy = new
        {
            id = h.ReportedBy?.Id ?? h.ReportedByUserId,
            fullName = h.ReportedBy != null
                ? $"{h.ReportedBy.FirstName} {h.ReportedBy.LastName}".Trim()
                : "Unknown",
        },
        userVote,
        bumped,
    };

    public static object ToHazardUpdated(HazardEntity h, int? userVote = null, bool removed = false) => new
    {
        id = h.Id,
        score = h.Score,
        status = h.Status,
        userVote,
        removed,
    };
}
