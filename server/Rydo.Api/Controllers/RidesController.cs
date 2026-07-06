using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;
using Rydo.Api.Services;

namespace Rydo.Api.Controllers;

[ApiController]
[Route("api/rides")]
public class RidesController(RydoDbContext db, HazardService hazards) : ControllerBase
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

        if (!RideEventWindow.IsOpen(g))
            return Forbid();

        if (RideEventWindow.HasStarted(g))
        {
            var newDate = body.ScheduledDate.ToUniversalTime();
            if (newDate != g.ScheduledDate.ToUniversalTime())
                return Problem(statusCode: 400, title: "Cannot change scheduled start after the ride has started");
        }

        if (body.RouteId is int rid && !await db.Routes.AnyAsync(r => r.Id == rid, ct))
            return NotFound();

        var participantCount = await db.RideParticipants.CountAsync(p => p.RideId == rideId, ct);
        var max = body.MaxParticipants > 0 ? body.MaxParticipants : 20;
        if (max < participantCount)
            return Problem(
                statusCode: 400,
                title: "Invalid max participants",
                detail: "Cannot set max below current roster size.");

        if (RydoTextLimits.ValidateRideName(body.Name, out var normalizedName) is { } nameErr)
            return Problem(statusCode: 400, detail: nameErr);

        g.Name = normalizedName;
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

    public record SendRideInvitesBody(int[] UserIds);

    [HttpPost("{rideId:int}/invites")]
    [Authorize]
    public async Task<IActionResult> SendRideInvites(int rideId, [FromBody] SendRideInvitesBody body, CancellationToken ct)
    {
        if (CurrentUserId() is not { } viewerId)
            return Unauthorized();

        var ride = await db.Rides.AsNoTracking().FirstOrDefaultAsync(r => r.Id == rideId, ct);
        if (ride == null)
            return NotFound();

        if (ride.CreatedByUserId != viewerId)
            return Forbid();

        if (ride.ClubId != null)
            return Problem(statusCode: 400, detail: "Only personal rides support friend invites.");

        if (ride.Kind == RideKind.SoloLog)
            return Problem(statusCode: 400, detail: "This ride cannot accept invites.");

        var userIds = (body.UserIds ?? []).Distinct().Where(id => id != viewerId).ToArray();
        if (userIds.Length == 0)
            return Ok(new { sent = 0, inviteIds = Array.Empty<int>() });

        var occupied = await RideInviteHelper.CountOccupiedSlotsAsync(db, rideId, ct);
        var slotsLeft = ride.MaxParticipants - occupied;
        if (slotsLeft <= 0)
            return Problem(statusCode: 400, detail: "Ride has no open slots for invites.");

        if (userIds.Length > slotsLeft)
            return Problem(statusCode: 400, detail: $"Only {slotsLeft} invite slot(s) remaining.");

        var existingParticipants = await db.RideParticipants.AsNoTracking()
            .Where(p => p.RideId == rideId && userIds.Contains(p.UserId))
            .Select(p => p.UserId)
            .ToListAsync(ct);

        var pendingInvitees = await db.RideInvites.AsNoTracking()
            .Where(i => i.RideId == rideId && i.Status == RideInviteStatus.Pending && userIds.Contains(i.ToUserId))
            .Select(i => i.ToUserId)
            .ToListAsync(ct);

        var createdIds = new List<int>();
        var now = DateTime.UtcNow;

        foreach (var toUserId in userIds)
        {
            if (existingParticipants.Contains(toUserId) || pendingInvitees.Contains(toUserId))
                continue;

            if (!await RideInviteHelper.AreFriendsAsync(db, viewerId, toUserId, ct))
                return Problem(statusCode: 400, detail: "Invites can only be sent to friends.");

            var invite = new RideInvite
            {
                RideId = rideId,
                FromUserId = viewerId,
                ToUserId = toUserId,
                Status = RideInviteStatus.Pending,
                CreatedAt = now,
            };
            db.RideInvites.Add(invite);
            db.InboxItems.Add(new InboxItem
            {
                RecipientUserId = toUserId,
                Kind = InboxItemKind.RideInvite,
                RideInvite = invite,
                CreatedAt = now,
            });
            await db.SaveChangesAsync(ct);
            createdIds.Add(invite.Id);
            occupied++;
        }

        return Ok(new { sent = createdIds.Count, inviteIds = createdIds });
    }

    [HttpPost("{rideId:int}/invites/{inviteId:int}/accept")]
    [Authorize]
    public async Task<IActionResult> AcceptRideInvite(int rideId, int inviteId, CancellationToken ct)
    {
        if (CurrentUserId() is not { } viewerId)
            return Unauthorized();

        var invite = await db.RideInvites.FirstOrDefaultAsync(i => i.Id == inviteId && i.RideId == rideId, ct);
        if (invite == null)
            return NotFound();
        if (invite.ToUserId != viewerId)
            return Problem(statusCode: 403, detail: "Only the invitee can accept this invite.");
        if (invite.Status != RideInviteStatus.Pending)
            return Problem(statusCode: 400, detail: "This invite is no longer pending.");

        var ride = await db.Rides.FirstOrDefaultAsync(r => r.Id == rideId, ct);
        if (ride == null)
            return NotFound();

        var count = await db.RideParticipants.CountAsync(p => p.RideId == rideId, ct);
        if (count >= ride.MaxParticipants)
            return Problem(statusCode: 400, detail: "Ride has reached max participants.");

        if (!await db.RideParticipants.AnyAsync(p => p.RideId == rideId && p.UserId == viewerId, ct))
        {
            db.RideParticipants.Add(new RideParticipant { RideId = rideId, UserId = viewerId });
        }

        var now = DateTime.UtcNow;
        invite.Status = RideInviteStatus.Accepted;
        invite.RespondedAt = now;

        await db.InboxItems
            .Where(i => i.RideInviteId == inviteId && i.RecipientUserId == viewerId)
            .ExecuteUpdateAsync(s => s.SetProperty(i => i.ResolvedAt, now), ct);

        await db.SaveChangesAsync(ct);
        return Ok(new { status = "joined" });
    }

    [HttpPost("{rideId:int}/invites/{inviteId:int}/decline")]
    [Authorize]
    public async Task<IActionResult> DeclineRideInvite(int rideId, int inviteId, CancellationToken ct)
    {
        if (CurrentUserId() is not { } viewerId)
            return Unauthorized();

        var invite = await db.RideInvites.FirstOrDefaultAsync(i => i.Id == inviteId && i.RideId == rideId, ct);
        if (invite == null)
            return NotFound();
        if (invite.ToUserId != viewerId)
            return Problem(statusCode: 403, detail: "Only the invitee can decline this invite.");
        if (invite.Status != RideInviteStatus.Pending)
            return Problem(statusCode: 400, detail: "This invite is no longer pending.");

        var now = DateTime.UtcNow;
        invite.Status = RideInviteStatus.Declined;
        invite.RespondedAt = now;

        await db.InboxItems
            .Where(i => i.RideInviteId == inviteId && i.RecipientUserId == viewerId)
            .ExecuteUpdateAsync(s => s.SetProperty(i => i.ResolvedAt, now), ct);

        await db.SaveChangesAsync(ct);
        return NoContent();
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

        if (await db.HistoryEntries.AnyAsync(h => h.UserId == uid && h.RideId == rideId, ct))
            return Problem(statusCode: 409, title: "Cannot leave", detail: "Already in your history.");

        var ride = await db.Rides.AsNoTracking().FirstOrDefaultAsync(r => r.Id == rideId, ct);
        if (ride != null && ride.Kind != RideKind.SoloLog && !RideEventWindow.IsOpen(ride))
            return Problem(statusCode: 409, title: "Cannot leave", detail: "Event window closed.");

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

    public record CreateRideHazardBody(string Type, string? Description, double Latitude, double Longitude);

    [HttpPost("{rideId:int}/hazards")]
    [Authorize]
    public async Task<IActionResult> CreateHazard(int rideId, [FromBody] CreateRideHazardBody body, CancellationToken ct)
    {
        var uid = CurrentUserId();
        if (uid == null) return Unauthorized();

        var (hazard, bumped, error) = await hazards.CreateDuringLiveRideAsync(
            rideId,
            uid.Value,
            body.Type,
            body.Description,
            body.Latitude,
            body.Longitude,
            ct);

        if (error != null)
        {
            if (error is "Ride not found.")
                return NotFound(new { detail = error });
            return Problem(statusCode: 400, detail: error);
        }

        return Ok(Services.Hazards.HazardJsonMapper.ToClientHazard(hazard, bumped: bumped));
    }
}
