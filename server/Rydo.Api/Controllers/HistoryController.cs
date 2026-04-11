using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;
using Rydo.Api.Security;

namespace Rydo.Api.Controllers;

[ApiController]
[Route("history")]
[Authorize]
public class HistoryController(RydoDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var uid = ClaimsUserId.FromPrincipal(User);
        var list = await db.HistoryEntries.AsNoTracking()
            .Include(h => h.Route)
            .Include(h => h.RideGroup).ThenInclude(rg => rg!.Club)
            .Where(h => h.UserId == uid)
            .OrderByDescending(h => h.CompletedAt)
            .ToListAsync(ct);
        var items = list.Select(h =>
        {
            List<List<double>>? previewCoords = null;
            if (h.Route != null
                && !string.IsNullOrWhiteSpace(h.Route.PreviewCoordinatesJson)
                && h.Route.PreviewCoordinatesJson != "[]")
            {
                previewCoords = JsonSerializer.Deserialize<List<List<double>>>(h.Route.PreviewCoordinatesJson);
            }

            string? rideKind = null;
            int? rideGroupClubId = null;
            string? rideGroupClubName = null;
            if (h.RideGroupId != null && h.RideGroup != null)
            {
                rideKind = h.RideGroup.ClubId.HasValue ? "club" : "personal";
                rideGroupClubId = h.RideGroup.ClubId;
                rideGroupClubName = h.RideGroup.Club?.Name;
            }

            return new
            {
                id = h.Id,
                routeId = h.RouteId,
                routeTitle = h.RouteTitle,
                routeDifficulty = h.Route != null ? h.Route.Difficulty : (string?)null,
                estimatedDurationMinutes = h.Route != null ? h.Route.EstimatedDurationMinutes : (int?)null,
                completedAt = h.CompletedAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                durationMinutes = h.DurationMinutes,
                distanceKm = h.DistanceKm,
                elevationGainM = h.ElevationGainM,
                rideGroupId = h.RideGroupId,
                rideKind,
                clubId = rideGroupClubId,
                clubName = rideGroupClubName,
                preview = previewCoords is { Count: > 0 }
                    ? new { coordinates = previewCoords }
                    : null,
            };
        }).ToList();
        return Ok(items);
    }
}
