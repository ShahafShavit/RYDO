using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;
using Rydo.Api.Security;
using Rydo.Api.Services;

namespace Rydo.Api.Controllers;

[ApiController]
[Route("api/history")]
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
            var route = h.Route;
            List<List<double>>? previewCoords = null;
            if (route != null
                && !string.IsNullOrWhiteSpace(route.PreviewCoordinatesJson)
                && route.PreviewCoordinatesJson != "[]")
            {
                previewCoords = JsonSerializer.Deserialize<List<List<double>>>(route.PreviewCoordinatesJson);
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

            var durationMinutes = HistoryMergeHelper.EffectiveDurationMinutes(h, route);
            var distanceKm = HistoryMergeHelper.EffectiveDistanceKm(h, route);
            var elevationGainM = HistoryMergeHelper.EffectiveElevationGainM(h, route);

            return new
            {
                id = h.Id,
                routeId = h.RouteId,
                routeTitle = h.RouteTitle,
                routeDifficulty = route != null ? route.Difficulty : (string?)null,
                estimatedDurationMinutes = route != null ? route.EstimatedDurationMinutes : (int?)null,
                completedAt = h.CompletedAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                durationMinutes,
                distanceKm,
                elevationGainM,
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
