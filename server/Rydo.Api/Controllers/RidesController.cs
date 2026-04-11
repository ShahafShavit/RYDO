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

    [HttpGet("{rideId:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetRide(int rideId, CancellationToken ct)
    {
        var g = await db.RideGroups.AsNoTracking()
            .Include(x => x.Participants).ThenInclude(p => p.User)
            .Include(x => x.Route)
            .Include(x => x.Club)
            .FirstOrDefaultAsync(x => x.Id == rideId, ct);
        if (g == null) return NotFound();

        var uid = CurrentUserId();
        var include = await RideGroupResponseHelper.ViewerCanSeeRoster(db, g.ClubId, uid, ct);
        var participantTotal = await db.RideParticipants.AsNoTracking().CountAsync(p => p.RideGroupId == rideId, ct);
        return Ok(RideGroupResponseHelper.ToResponse(g, include, participantTotal));
    }

    [HttpPost("{rideId:int}/join")]
    [Authorize]
    public async Task<IActionResult> JoinRide(int rideId, CancellationToken ct)
    {
        var uid = CurrentUserId() ?? 0;
        var g = await db.RideGroups.FirstOrDefaultAsync(r => r.Id == rideId, ct);
        if (g == null) return NotFound();

        if (g.ClubId is int cid)
        {
            var isMember = await db.ClubMembers.AnyAsync(
                m => m.ClubId == cid && m.UserId == uid && m.MembershipStatus == ClubMembershipStatus.Active, ct);
            if (!isMember) return Forbid();
        }

        var count = await db.RideParticipants.CountAsync(p => p.RideGroupId == rideId, ct);
        if (count >= g.MaxParticipants)
            return Problem(statusCode: 400, title: "Full", detail: "Ride has reached max participants.");

        if (await db.RideParticipants.AnyAsync(p => p.RideGroupId == rideId && p.UserId == uid, ct))
            return Ok(new { status = "already_joined" });

        db.RideParticipants.Add(new RideParticipant { RideGroupId = rideId, UserId = uid });
        await db.SaveChangesAsync(ct);
        return Ok(new { status = "joined" });
    }

    [HttpPost("{rideId:int}/leave")]
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
