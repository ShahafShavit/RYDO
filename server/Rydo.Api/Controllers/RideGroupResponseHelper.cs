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

    public static object ToResponse(RideGroup g, bool includeRoster)
    {
        var count = g.Participants.Count;
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
}
