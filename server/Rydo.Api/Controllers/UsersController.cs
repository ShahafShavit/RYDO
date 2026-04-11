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

    [HttpGet("me/rides")]
    public async Task<IActionResult> MyRides(CancellationToken ct)
    {
        var uid = CurrentUserId();
        if (uid == null) return Unauthorized();

        var groups = await db.RideGroups.AsNoTracking()
            .Include(g => g.Participants).ThenInclude(p => p.User)
            .Include(g => g.Route)
            .Include(g => g.Club)
            .Where(g => g.Participants.Any(p => p.UserId == uid.Value))
            .OrderBy(g => g.ScheduledDate)
            .ToListAsync(ct);

        var items = new List<object>();
        foreach (var g in groups)
        {
            var include = await RideGroupResponseHelper.ViewerCanSeeRoster(db, g.ClubId, uid, ct);
            items.Add(RideGroupResponseHelper.ToResponse(g, include));
        }

        return Ok(items);
    }
}
