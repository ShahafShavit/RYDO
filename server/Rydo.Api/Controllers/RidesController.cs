using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;

namespace Rydo.Api.Controllers;

[ApiController]
[Route("rides")]
public class RidesController(RydoDbContext db) : ControllerBase
{
    private int? CurrentUserId()
    {
        var s = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(s, out var id) ? id : null;
    }

    private static string DisplayName(ApplicationUser? u) =>
        u == null ? "" : string.Join(" ", new[] { u.FirstName, u.LastName }.Where(x => !string.IsNullOrWhiteSpace(x))).Trim();

    private static object RideGroupDto(RideGroup g, bool includeDetails)
    {
        var participantIds = g.Participants.Select(p => p.UserId).ToList();

        return new
        {
            id = g.Id,
            name = g.Name,
            description = g.Description,
            scheduledDate = g.ScheduledDate.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
            routeId = g.RouteId,
            routeTitle = g.Route != null ? g.Route.Title : "",
            participants = participantIds,
            participantDetails = includeDetails
                ? g.Participants.Select(p => new { userId = p.UserId, displayName = DisplayName(p.User) }).ToList()
                : null,
            maxParticipants = g.MaxParticipants,
            clubId = g.ClubId,
            clubName = g.Club != null ? g.Club.Name : null,
        };
    }

    [HttpGet("groups")]
    [AllowAnonymous]
    public async Task<IActionResult> Groups(CancellationToken ct)
    {
        var groups = await db.RideGroups.AsNoTracking()
            .Include(g => g.Participants).ThenInclude(p => p.User)
            .Include(g => g.Route)
            .Include(g => g.Club)
            .ToListAsync(ct);
        var items = groups.Select(g => RideGroupDto(g, includeDetails: true)).ToList();
        return Ok(items);
    }

    public record CreateRideGroup(
        string Name,
        string Description,
        DateTime ScheduledDate,
        int RouteId,
        int MaxParticipants,
        int? ClubId,
        bool ScheduleForWholeClub);

    [HttpPost("groups")]
    [Authorize]
    public async Task<IActionResult> CreateGroup([FromBody] CreateRideGroup body, CancellationToken ct)
    {
        if (!await db.Routes.AnyAsync(r => r.Id == body.RouteId, ct))
            return NotFound();

        var uid = CurrentUserId() ?? 0;
        if (body.ClubId is int cid)
        {
            var canLink = await db.ClubMembers.AnyAsync(
                m => m.ClubId == cid && m.UserId == uid && m.MembershipStatus == ClubMembershipStatus.Active, ct);
            if (!canLink) return Forbid();
        }

        var g = new RideGroup
        {
            Name = body.Name,
            Description = body.Description ?? "",
            ScheduledDate = body.ScheduledDate.ToUniversalTime(),
            RouteId = body.RouteId,
            MaxParticipants = body.MaxParticipants > 0 ? body.MaxParticipants : 20,
            ClubId = body.ClubId,
        };
        db.RideGroups.Add(g);
        await db.SaveChangesAsync(ct);

        db.RideParticipants.Add(new RideParticipant { RideGroupId = g.Id, UserId = uid });

        if (body.ScheduleForWholeClub && body.ClubId is int clubId)
        {
            var isClubAdmin = await db.ClubMembers.AnyAsync(
                m => m.ClubId == clubId && m.UserId == uid && m.Role == ClubMemberRole.Admin && m.MembershipStatus == ClubMembershipStatus.Active, ct);
            if (!isClubAdmin)
            {
                await db.SaveChangesAsync(ct);
                var route = await db.Routes.AsNoTracking().FirstAsync(r => r.Id == g.RouteId, ct);
                return Ok(BuildCreateResponse(g, route.Title, new[] { uid }));
            }

            var memberIds = await db.ClubMembers.AsNoTracking()
                .Where(m => m.ClubId == clubId && m.MembershipStatus == ClubMembershipStatus.Active)
                .OrderBy(m => m.UserId)
                .Select(m => m.UserId)
                .ToListAsync(ct);

            var added = new HashSet<int> { uid };
            foreach (var muid in memberIds)
            {
                if (added.Count >= g.MaxParticipants) break;
                if (added.Add(muid))
                    db.RideParticipants.Add(new RideParticipant { RideGroupId = g.Id, UserId = muid });
            }
        }

        await db.SaveChangesAsync(ct);

        var createdRoute = await db.Routes.AsNoTracking().FirstAsync(r => r.Id == g.RouteId, ct);
        var finalParts = await db.RideParticipants.Where(p => p.RideGroupId == g.Id).Select(p => p.UserId).ToListAsync(ct);
        return Ok(BuildCreateResponse(g, createdRoute.Title, finalParts));
    }

    private static object BuildCreateResponse(RideGroup g, string routeTitle, IReadOnlyList<int> participants) => new
    {
        id = g.Id,
        name = g.Name,
        description = g.Description,
        scheduledDate = g.ScheduledDate,
        routeId = g.RouteId,
        routeTitle,
        participants,
        maxParticipants = g.MaxParticipants,
        clubId = g.ClubId,
    };

    [HttpGet("events/{rideId:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> Event(int rideId, CancellationToken ct)
    {
        var g = await db.RideGroups.AsNoTracking()
            .Include(x => x.Participants).ThenInclude(p => p.User)
            .Include(x => x.Route)
            .Include(x => x.Club)
            .FirstOrDefaultAsync(x => x.Id == rideId, ct);
        if (g == null) return NotFound();
        return Ok(RideGroupDto(g, includeDetails: true));
    }

    [HttpPost("groups/{rideId:int}/join")]
    [Authorize]
    public async Task<IActionResult> JoinRide(int rideId, CancellationToken ct)
    {
        var uid = CurrentUserId() ?? 0;
        var g = await db.RideGroups.FirstOrDefaultAsync(r => r.Id == rideId, ct);
        if (g == null) return NotFound();

        var count = await db.RideParticipants.CountAsync(p => p.RideGroupId == rideId, ct);
        if (count >= g.MaxParticipants)
            return Problem(statusCode: 400, title: "Full", detail: "Ride has reached max participants.");

        if (await db.RideParticipants.AnyAsync(p => p.RideGroupId == rideId && p.UserId == uid, ct))
            return Ok(new { status = "already_joined" });

        db.RideParticipants.Add(new RideParticipant { RideGroupId = rideId, UserId = uid });
        await db.SaveChangesAsync(ct);
        return Ok(new { status = "joined" });
    }

    [HttpPost("groups/{rideId:int}/leave")]
    [Authorize]
    public async Task<IActionResult> LeaveRide(int rideId, CancellationToken ct)
    {
        var uid = CurrentUserId() ?? 0;
        var p = await db.RideParticipants.FirstOrDefaultAsync(x => x.RideGroupId == rideId && x.UserId == uid, ct);
        if (p == null) return NotFound();

        db.RideParticipants.Remove(p);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
