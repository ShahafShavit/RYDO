using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;
using Rydo.Api.Services;

namespace Rydo.Api.Controllers;

internal static class RideResponseHelper
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

    public static async Task<bool> ViewerCanEditRideAsync(
        RydoDbContext db,
        Ride g,
        int viewerUserId,
        CancellationToken ct)
    {
        if (g.Kind == RideKind.SoloLog) return false;
        if (g.ScheduledDate < DateTime.UtcNow) return false;
        if (g.ClubId == null) return g.CreatedByUserId == viewerUserId;
        if (g.CreatedByUserId == viewerUserId) return true;
        return await db.ClubMembers.AnyAsync(
            m => m.ClubId == g.ClubId && m.UserId == viewerUserId
                 && m.Role == ClubMemberRole.Admin
                 && m.MembershipStatus == ClubMembershipStatus.Active,
            ct);
    }

    /// <summary>
    /// Computes <see cref="ViewerCanEditRideAsync"/> for many rides with batched admin membership queries.
    /// </summary>
    public static async Task<Dictionary<int, bool>> BuildViewerCanEditMapAsync(
        RydoDbContext db,
        IReadOnlyList<Ride> groups,
        int viewerUserId,
        CancellationToken ct)
    {
        var map = new Dictionary<int, bool>();
        if (groups.Count == 0) return map;

        var now = DateTime.UtcNow;
        var clubIdsNeedingAdminCheck = groups
            .Where(g => g.Kind != RideKind.SoloLog && g.ScheduledDate >= now && g.ClubId is int && g.CreatedByUserId != viewerUserId)
            .Select(g => g.ClubId!.Value)
            .Distinct()
            .ToList();

        HashSet<int> adminClubIds = new();
        if (clubIdsNeedingAdminCheck.Count > 0)
        {
            var rows = await db.ClubMembers.AsNoTracking()
                .Where(m => clubIdsNeedingAdminCheck.Contains(m.ClubId)
                            && m.UserId == viewerUserId
                            && m.Role == ClubMemberRole.Admin
                            && m.MembershipStatus == ClubMembershipStatus.Active)
                .Select(m => m.ClubId)
                .ToListAsync(ct);
            adminClubIds = rows.ToHashSet();
        }

        foreach (var g in groups)
        {
            bool can;
            if (g.Kind == RideKind.SoloLog || g.ScheduledDate < now)
                can = false;
            else if (g.ClubId == null)
                can = g.CreatedByUserId == viewerUserId;
            else if (g.CreatedByUserId == viewerUserId)
                can = true;
            else
                can = adminClubIds.Contains(g.ClubId.Value);
            map[g.Id] = can;
        }

        return map;
    }

    /// <param name="totalParticipantCount">
    /// Optional authoritative count from <c>RideParticipants</c> (fixes EF cases where the in-memory collection is empty but rows exist).
    /// </param>
    public static object ToResponse(Ride g, bool includeRoster, int? totalParticipantCount = null, bool viewerCanEdit = false)
    {
        var count = totalParticipantCount ?? g.Participants.Count;
        var routePreview = RoutePreviewPayload(g.Route);
        var createdBy = new
        {
            id = g.CreatedByUserId,
            fullName = DisplayName(g.CreatedBy),
        };

        var rideKind = g.Kind == RideKind.SoloLog ? "soloLog" : "scheduled";

        if (!includeRoster)
        {
            return new
            {
                id = g.Id,
                rideKind,
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
                createdBy,
                viewerCanEdit,
            };
        }

        var participantIds = g.Participants.Select(p => p.UserId).ToList();
        return new
        {
            id = g.Id,
            rideKind,
            name = g.Name,
            description = g.Description,
            scheduledDate = g.ScheduledDate.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
            routeId = g.RouteId,
            routeTitle = g.Route != null ? g.Route.Title : "",
            routePreview,
            participantCount = count,
            participants = participantIds,
            participantDetails = g.Participants
                .Select(p => new
                {
                    userId = p.UserId,
                    displayName = DisplayName(p.User),
                    avatarUrl = UserPublicFields.RosterAvatarUrl(p.User),
                })
                .ToList(),
            maxParticipants = g.MaxParticipants,
            clubId = g.ClubId,
            clubName = g.Club != null ? g.Club.Name : null,
            createdBy,
            viewerCanEdit,
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
