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
    private const int MaxHistoryTake = 100;

    [HttpGet]
    public IActionResult List([FromQuery] int skip = 0, [FromQuery] int take = 20, [FromQuery] string? q = null)
    {
        var uid = ClaimsUserId.FromPrincipal(User);
        take = Math.Clamp(take, 1, MaxHistoryTake);
        if (skip < 0) skip = 0;

        var query = db.HistoryEntries.AsNoTracking()
            .Include(h => h.Route)
            .Include(h => h.RideGroup).ThenInclude(rg => rg!.Club)
            .Where(h => h.UserId == uid);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim();
            query = query.Where(h =>
                h.RouteTitle.Contains(term)
                || (h.Route != null && h.Route.Difficulty.Contains(term))
                || (h.RideGroup != null && h.RideGroup.Club != null && h.RideGroup.Club.Name.Contains(term)));
        }

        query = query.OrderByDescending(h => h.CompletedAt);
        var page = Pagination.PageQueryable(query, skip, take);
        var items = page.Items.Select(MapEntry).ToList();
        return Ok(new { items, total = page.Total, skip = page.Skip, take = page.Take });
    }

    private static object MapEntry(HistoryEntry h)
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
    }
}
