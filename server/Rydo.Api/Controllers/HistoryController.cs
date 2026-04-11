using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;

namespace Rydo.Api.Controllers;

[ApiController]
[Route("history")]
[Authorize]
public class HistoryController(RydoDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var uid = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
        var list = await db.HistoryEntries.AsNoTracking()
            .Include(h => h.Route)
            .Where(h => h.UserId == uid)
            .OrderByDescending(h => h.CompletedAt)
            .ToListAsync(ct);
        var items = list.Select(h => new
        {
            id = h.Id,
            routeId = h.RouteId,
            routeTitle = h.RouteTitle,
            routeDifficulty = h.Route != null ? h.Route.Difficulty : (string?)null,
            completedAt = h.CompletedAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
            durationMinutes = h.DurationMinutes,
            distanceKm = h.DistanceKm,
            elevationGainM = h.ElevationGainM,
        }).ToList();
        return Ok(items);
    }
}
