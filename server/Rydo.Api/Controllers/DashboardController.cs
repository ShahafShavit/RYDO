using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;

namespace Rydo.Api.Controllers;

[ApiController]
[Route("dashboard")]
[Authorize]
public class DashboardController(RydoDbContext db) : ControllerBase
{
    [HttpGet("summary")]
    public async Task<IActionResult> Summary(CancellationToken ct)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");

        var completedRides = await db.HistoryEntries.CountAsync(h => h.UserId == userId, ct);
        var savedRoutes = await db.SavedRoutes.CountAsync(s => s.UserId == userId, ct);
        var groupRidesJoined = await db.RideParticipants.CountAsync(p => p.UserId == userId, ct);

        return Ok(new
        {
            completedRides,
            savedRoutes,
            groupRidesJoined,
        });
    }
}
