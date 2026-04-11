using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;

namespace Rydo.Api.Controllers;

internal static class RideGroupResponseHelper
{
    private static string DisplayName(ApplicationUser? u) =>
        u == null ? "" : string.Join(" ", new[] { u.FirstName, u.LastName }.Where(x => !string.IsNullOrWhiteSpace(x))).Trim();

    public static async Task<bool> ViewerCanSeeRoster(
        RydoDbContext db,
        int? rideClubId,
        int? viewerUserId,
        CancellationToken ct)
    {
        if (rideClubId == null) return true;
        if (viewerUserId == null) return false;
        return await db.ClubMembers.AnyAsync(
            m => m.ClubId == rideClubId.Value
                 && m.UserId == viewerUserId.Value
                 && m.MembershipStatus == ClubMembershipStatus.Active,
            ct);
    }

    /// <param name="totalParticipantCount">
    /// Optional authoritative count from <c>RideParticipants</c> (fixes EF cases where the in-memory collection is empty but rows exist).
    /// </param>
    public static object ToResponse(RideGroup g, bool includeRoster, int? totalParticipantCount = null)
    {
        var count = totalParticipantCount ?? g.Participants.Count;
        var routePreview = RoutePreviewPayload(g.Route);
        if (!includeRoster)
        {
            return new
            {
                id = g.Id,
                name = g.Name,
                description = g.Description,
                scheduledDate = g.ScheduledDate.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                routeId = g.RouteId,
                routeTitle = g.Route != null ? g.Route.Title : "",
                routePreview,
                participantCount = count,
                participants = (int[]?)null,
                participantDetails = (object?)null,
                maxParticipants = g.MaxParticipants,
                clubId = g.ClubId,
                clubName = g.Club != null ? g.Club.Name : null,
            };
        }

        var participantIds = g.Participants.Select(p => p.UserId).ToList();
        return new
        {
            id = g.Id,
            name = g.Name,
            description = g.Description,
            scheduledDate = g.ScheduledDate.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
            routeId = g.RouteId,
            routeTitle = g.Route != null ? g.Route.Title : "",
            routePreview,
            participantCount = count,
            participants = participantIds,
            participantDetails = g.Participants
                .Select(p => new { userId = p.UserId, displayName = DisplayName(p.User) })
                .ToList(),
            maxParticipants = g.MaxParticipants,
            clubId = g.ClubId,
            clubName = g.Club != null ? g.Club.Name : null,
        };
    }

    /// <summary>Same shape as history list <c>preview</c> — coordinates for map thumbnails.</summary>
    private static object? RoutePreviewPayload(RouteEntity? route)
    {
        if (route == null
            || string.IsNullOrWhiteSpace(route.PreviewCoordinatesJson)
            || route.PreviewCoordinatesJson == "[]")
            return null;

        var previewCoords = JsonSerializer.Deserialize<List<List<double>>>(route.PreviewCoordinatesJson);
        return previewCoords is { Count: > 0 }
            ? new { coordinates = previewCoords }
            : null;
    }
}
