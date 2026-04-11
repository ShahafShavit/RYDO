using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;

namespace Rydo.Api.Controllers;

[ApiController]
[Route("users")]
[Authorize]
public class UsersController(RydoDbContext db) : ControllerBase
{
    private int? CurrentUserId()
    {
        var s = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(s, out var id) ? id : null;
    }

    public record CreatePersonalRideBody(
        string Name,
        string Description,
        DateTime ScheduledDate,
        int? RouteId,
        int MaxParticipants);

    [HttpGet("me/rides")]
    public async Task<IActionResult> MyRides([FromQuery] string? q, [FromQuery] string? when, CancellationToken ct)
    {
        var uid = CurrentUserId();
        if (uid == null) return Unauthorized();

        var now = DateTime.UtcNow;
        var scope = (when ?? "all").Trim().ToLowerInvariant();
        if (scope is not ("all" or "upcoming" or "past"))
            scope = "all";

        var query = db.RideGroups.AsNoTracking()
            .Include(g => g.Participants).ThenInclude(p => p.User)
            .Include(g => g.Route)
            .Include(g => g.Club)
            .Where(g => g.Participants.Any(p => p.UserId == uid.Value));

        if (scope == "upcoming")
            query = query.Where(g => g.ScheduledDate >= now);
        else if (scope == "past")
            query = query.Where(g => g.ScheduledDate < now);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim();
            query = query.Where(g =>
                g.Name.Contains(term)
                || (g.Route != null && g.Route.Title.Contains(term))
                || (g.Club != null && g.Club.Name.Contains(term)));
        }

        query = scope == "past"
            ? query.OrderByDescending(g => g.ScheduledDate)
            : scope == "upcoming"
                ? query.OrderBy(g => g.ScheduledDate)
                : query.OrderByDescending(g => g.ScheduledDate);

        var groups = await query.ToListAsync(ct);

        var groupIds = groups.Select(g => g.Id).ToList();
        var countRows = await db.RideParticipants.AsNoTracking()
            .Where(p => groupIds.Contains(p.RideGroupId))
            .GroupBy(p => p.RideGroupId)
            .Select(grp => new { grp.Key, Cnt = grp.Count() })
            .ToListAsync(ct);
        var countByRide = countRows.ToDictionary(x => x.Key, x => x.Cnt);

        var items = new List<object>();
        foreach (var g in groups)
        {
            var include = await RideGroupResponseHelper.ViewerCanSeeRoster(db, g.ClubId, uid, ct);
            items.Add(RideGroupResponseHelper.ToResponse(g, include, countByRide.GetValueOrDefault(g.Id, 0)));
        }

        return Ok(items);
    }

    [HttpPost("me/rides")]
    public async Task<IActionResult> CreatePersonalRide([FromBody] CreatePersonalRideBody body, CancellationToken ct)
    {
        var uid = CurrentUserId();
        if (uid == null) return Unauthorized();
        if (body.RouteId is int rid && !await db.Routes.AnyAsync(r => r.Id == rid, ct)) return NotFound();

        var g = new RideGroup
        {
            Name = body.Name.Trim(),
            Description = body.Description?.Trim() ?? "",
            ScheduledDate = body.ScheduledDate.ToUniversalTime(),
            RouteId = body.RouteId,
            MaxParticipants = body.MaxParticipants > 0 ? body.MaxParticipants : 20,
            ClubId = null,
        };
        db.RideGroups.Add(g);
        await db.SaveChangesAsync(ct);

        db.RideParticipants.Add(new RideParticipant { RideGroupId = g.Id, UserId = uid.Value });
        await db.SaveChangesAsync(ct);

        var created = await db.RideGroups.AsNoTracking()
            .Include(x => x.Participants).ThenInclude(p => p.User)
            .Include(x => x.Route)
            .Include(x => x.Club)
            .FirstAsync(x => x.Id == g.Id, ct);

        var participantTotal = await db.RideParticipants.AsNoTracking().CountAsync(p => p.RideGroupId == g.Id, ct);
        return Ok(RideGroupResponseHelper.ToResponse(created, includeRoster: true, participantTotal));
    }
}
