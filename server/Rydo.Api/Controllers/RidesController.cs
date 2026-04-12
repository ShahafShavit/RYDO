using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;

namespace Rydo.Api.Controllers;

[ApiController]
[Route("api/rides")]
public class RidesController(RydoDbContext db) : ControllerBase
{
    private int? CurrentUserId()
    {
        var s = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(s, out var id) ? id : null;
    }

    [HttpGet("{rideId:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetRide(int rideId, CancellationToken ct)
    {
        var g = await db.Rides.AsNoTracking()
            .Include(x => x.Participants).ThenInclude(p => p.User)
            .Include(x => x.CreatedBy)
            .Include(x => x.Route)
            .Include(x => x.Club)
            .FirstOrDefaultAsync(x => x.Id == rideId, ct);
        if (g == null) return NotFound();

        var uid = CurrentUserId();
        if (g.ClubId is { } rideClubId && g.Club != null && g.Club.Visibility == ClubVisibility.Private)
        {
            var isActiveMember = uid != null && await db.ClubMembers.AnyAsync(
                m => m.ClubId == rideClubId && m.UserId == uid!.Value && m.MembershipStatus == ClubMembershipStatus.Active,
                ct);
            var isOnRoster = uid != null && g.Participants.Any(p => p.UserId == uid.Value);
            if (!isActiveMember && !isOnRoster)
                return NotFound();
        }

        var include = await RideResponseHelper.ViewerCanSeeRoster(db, g.ClubId, uid, ct);
        var participantTotal = await db.RideParticipants.AsNoTracking().CountAsync(p => p.RideId == rideId, ct);
        var canEdit = uid is { } viewerId && await RideResponseHelper.ViewerCanEditRideAsync(db, g, viewerId, ct);
        return Ok(RideResponseHelper.ToResponse(g, include, participantTotal, canEdit));
    }

    public record UpdateRideBody(
        string Name,
        string Description,
        DateTime ScheduledDate,
        int? RouteId,
        int MaxParticipants);

    [HttpPatch("{rideId:int}")]
    [Authorize]
    public async Task<IActionResult> UpdateRide(int rideId, [FromBody] UpdateRideBody body, CancellationToken ct)
    {
        var uid = CurrentUserId();
        if (uid == null) return Unauthorized();

        var g = await db.Rides
            .FirstOrDefaultAsync(x => x.Id == rideId, ct);
        if (g == null) return NotFound();

        if (!await RideResponseHelper.ViewerCanEditRideAsync(db, g, uid.Value, ct))
            return Forbid();

        if (body.RouteId is int rid && !await db.Routes.AnyAsync(r => r.Id == rid, ct))
            return NotFound();

        var participantCount = await db.RideParticipants.CountAsync(p => p.RideId == rideId, ct);
        var max = body.MaxParticipants > 0 ? body.MaxParticipants : 20;
        if (max < participantCount)
            return Problem(
                statusCode: 400,
                title: "Invalid max participants",
                detail: "Cannot set max below current roster size.");

        g.Name = body.Name.Trim();
        g.Description = body.Description?.Trim() ?? "";
        g.ScheduledDate = body.ScheduledDate.ToUniversalTime();
        g.RouteId = body.RouteId;
        g.MaxParticipants = max;

        await db.SaveChangesAsync(ct);

        var updated = await db.Rides.AsNoTracking()
            .Include(x => x.Participants).ThenInclude(p => p.User)
            .Include(x => x.CreatedBy)
            .Include(x => x.Route)
            .Include(x => x.Club)
            .FirstAsync(x => x.Id == rideId, ct);

        var participantTotal = await db.RideParticipants.AsNoTracking().CountAsync(p => p.RideId == rideId, ct);
        var include = await RideResponseHelper.ViewerCanSeeRoster(db, updated.ClubId, uid, ct);
        return Ok(RideResponseHelper.ToResponse(updated, include, participantTotal, viewerCanEdit: true));
    }

    [HttpPost("{rideId:int}/join")]
    [Authorize]
    public async Task<IActionResult> JoinRide(int rideId, CancellationToken ct)
    {
        var uid = CurrentUserId() ?? 0;
        var g = await db.Rides.FirstOrDefaultAsync(r => r.Id == rideId, ct);
        if (g == null) return NotFound();

        if (g.Kind == RideKind.SoloLog)
            return Problem(statusCode: 400, title: "Not joinable", detail: "This ride cannot accept additional participants.");

        if (g.ClubId is int cid)
        {
            var isMember = await db.ClubMembers.AnyAsync(
                m => m.ClubId == cid && m.UserId == uid && m.MembershipStatus == ClubMembershipStatus.Active, ct);
            if (!isMember) return Forbid();
        }

        var count = await db.RideParticipants.CountAsync(p => p.RideId == rideId, ct);
        if (count >= g.MaxParticipants)
            return Problem(statusCode: 400, title: "Full", detail: "Ride has reached max participants.");

        if (await db.RideParticipants.AnyAsync(p => p.RideId == rideId && p.UserId == uid, ct))
            return Ok(new { status = "already_joined" });

        db.RideParticipants.Add(new RideParticipant { RideId = rideId, UserId = uid });
        await db.SaveChangesAsync(ct);
        return Ok(new { status = "joined" });
    }

    [HttpPost("{rideId:int}/leave")]
    [Authorize]
    public async Task<IActionResult> LeaveRide(int rideId, CancellationToken ct)
    {
        var uid = CurrentUserId() ?? 0;
        var p = await db.RideParticipants.FirstOrDefaultAsync(x => x.RideId == rideId && x.UserId == uid, ct);
        if (p == null) return NotFound();

        var remaining = await db.RideParticipants.CountAsync(x => x.RideId == rideId, ct);
        if (remaining <= 1)
            return Problem(
                statusCode: 400,
                title: "Cannot leave",
                detail: "The last participant cannot leave the ride.");

        db.RideParticipants.Remove(p);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
