using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;
using Rydo.Api.Services;

namespace Rydo.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController(RydoDbContext db, UserManager<ApplicationUser> users) : ControllerBase
{
    private const int MaxUpcomingMyRides = 4;
    private const int MaxPastMyRidesTake = 100;

    private int? CurrentUserId()
    {
        var s = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(s, out var id) ? id : null;
    }

    [HttpGet("search")]
    public async Task<IActionResult> SearchUsers([FromQuery] string? q, [FromQuery] int take = 15, CancellationToken ct = default)
    {
        if (CurrentUserId() is not { } viewerId)
            return Unauthorized();

        var term = (q ?? "").Trim();
        if (term.Length < 2)
            return Ok(new { items = Array.Empty<object>() });

        take = Math.Clamp(take, 1, 50);

        var rows = await users.Users.AsNoTracking()
            .Where(u => u.Id != viewerId)
            .Where(u =>
                (u.FirstName != null && u.FirstName.Contains(term))
                || (u.LastName != null && u.LastName.Contains(term))
                || (u.Email != null && u.Email.Contains(term)))
            .OrderBy(u => u.LastName)
            .ThenBy(u => u.FirstName)
            .ThenBy(u => u.Id)
            .Take(take)
            .ToListAsync(ct);

        var items = rows.Select(u => new
        {
            id = u.Id,
            fullName = $"{u.FirstName} {u.LastName}".Trim(),
            avatarUrl = UserPublicFields.RosterAvatarUrl(u),
        }).ToList();

        return Ok(new { items });
    }

    [HttpGet("{userId:int}/profile")]
    public async Task<IActionResult> GetUserProfile(int userId, CancellationToken ct)
    {
        if (CurrentUserId() is not { } viewerId)
            return Unauthorized();

        var subject = await users.FindByIdAsync(userId.ToString());
        if (subject == null)
            return NotFound();

        var pref = await db.UserPreferences.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == userId, ct);

        if (viewerId == userId)
        {
            var roles = await users.GetRolesAsync(subject);
            return Ok(UserProfileResponse.Full(subject, roles, pref));
        }

        return Ok(UserProfileResponse.PublicView(subject, pref));
    }

    public record CreatePersonalRideBody(
        string Name,
        string Description,
        DateTime ScheduledDate,
        int? RouteId,
        int MaxParticipants);

    [HttpGet("me/rides")]
    public async Task<IActionResult> MyRides(
        [FromQuery] string? q,
        [FromQuery] string? when,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 20,
        CancellationToken ct = default)
    {
        var uid = CurrentUserId();
        if (uid == null) return Unauthorized();

        var now = DateTime.UtcNow;
        var scope = (when ?? "all").Trim().ToLowerInvariant();
        if (scope is not ("all" or "upcoming" or "past"))
            scope = "all";

        var query = db.Rides.AsNoTracking()
            .Include(g => g.Participants).ThenInclude(p => p.User)
            .Include(g => g.CreatedBy)
            .Include(g => g.Route)
            .Include(g => g.Club)
            .Where(g => g.Kind != RideKind.SoloLog)
            .Where(g => g.Participants.Any(p => p.UserId == uid.Value));

        if (scope == "upcoming")
            query = query.Where(g => g.ScheduledDate >= now);
        else if (scope == "past")
        {
            query = query.Where(g => g.ScheduledDate < now);
            query = query.Where(g => !db.HistoryEntries.Any(h => h.UserId == uid.Value && h.RideId == g.Id));
        }

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

        if (scope == "upcoming")
            query = query.Take(MaxUpcomingMyRides);

        IReadOnlyList<Ride> groups;
        int? pagedTotal = null;
        int? pagedSkip = null;
        int? pagedTake = null;

        if (scope == "past")
        {
            take = Math.Clamp(take, 1, MaxPastMyRidesTake);
            if (skip < 0) skip = 0;
            var page = Pagination.PageQueryable(query, skip, take);
            groups = page.Items;
            pagedTotal = page.Total;
            pagedSkip = page.Skip;
            pagedTake = page.Take;
        }
        else
        {
            groups = await query.ToListAsync(ct);
        }

        var groupIds = groups.Select(g => g.Id).ToList();
        var countRows = await db.RideParticipants.AsNoTracking()
            .Where(p => groupIds.Contains(p.RideId))
            .GroupBy(p => p.RideId)
            .Select(grp => new { grp.Key, Cnt = grp.Count() })
            .ToListAsync(ct);
        var countByRide = countRows.ToDictionary(x => x.Key, x => x.Cnt);

        var editMap = await RideResponseHelper.BuildViewerCanEditMapAsync(db, groups, uid.Value, ct);

        var items = new List<object>();
        foreach (var g in groups)
        {
            var include = await RideResponseHelper.ViewerCanSeeRoster(db, g.ClubId, uid, ct);
            items.Add(RideResponseHelper.ToResponse(
                g,
                include,
                countByRide.GetValueOrDefault(g.Id, 0),
                editMap.GetValueOrDefault(g.Id, false)));
        }

        if (scope == "past" && pagedTotal.HasValue && pagedSkip.HasValue && pagedTake.HasValue)
            return Ok(new { items, total = pagedTotal.Value, skip = pagedSkip.Value, take = pagedTake.Value });

        return Ok(items);
    }

    [HttpPost("me/rides")]
    public async Task<IActionResult> CreatePersonalRide([FromBody] CreatePersonalRideBody body, CancellationToken ct)
    {
        var uid = CurrentUserId();
        if (uid == null) return Unauthorized();
        if (body.RouteId is int rid && !await db.Routes.AnyAsync(r => r.Id == rid, ct)) return NotFound();

        var g = new Ride
        {
            Kind = RideKind.Scheduled,
            Name = body.Name.Trim(),
            Description = body.Description?.Trim() ?? "",
            ScheduledDate = body.ScheduledDate.ToUniversalTime(),
            RouteId = body.RouteId,
            MaxParticipants = body.MaxParticipants > 0 ? body.MaxParticipants : 20,
            ClubId = null,
            CreatedByUserId = uid.Value,
        };
        db.Rides.Add(g);
        await db.SaveChangesAsync(ct);

        db.RideParticipants.Add(new RideParticipant { RideId = g.Id, UserId = uid.Value });
        await db.SaveChangesAsync(ct);

        var created = await db.Rides.AsNoTracking()
            .Include(x => x.Participants).ThenInclude(p => p.User)
            .Include(x => x.CreatedBy)
            .Include(x => x.Route)
            .Include(x => x.Club)
            .FirstAsync(x => x.Id == g.Id, ct);

        var participantTotal = await db.RideParticipants.AsNoTracking().CountAsync(p => p.RideId == g.Id, ct);
        var canEdit = await RideResponseHelper.ViewerCanEditRideAsync(db, created, uid.Value, ct);
        return Ok(RideResponseHelper.ToResponse(created, includeRoster: true, participantTotal, canEdit));
    }
}
