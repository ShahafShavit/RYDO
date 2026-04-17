using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;
using Rydo.Api.Services;

namespace Rydo.Api.Controllers;

[ApiController]
[Route("api/routes")]
public class RoutesController(RydoDbContext db) : ControllerBase
{
    private const int MaxRouteListTake = 200;

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> List(
        [FromQuery] int skip = 0,
        [FromQuery] int take = 20,
        [FromQuery] string? q = null,
        [FromQuery] int? createdByUserId = null,
        [FromQuery] string? terrain = null,
        [FromQuery] string? difficulty = null,
        [FromQuery] string? distance = null,
        [FromQuery] double? nearLat = null,
        [FromQuery] double? nearLng = null,
        [FromQuery] double? maxKm = null,
        [FromQuery] string? sort = null,
        CancellationToken ct = default)
    {
        take = Math.Clamp(take, 1, MaxRouteListTake);
        if (skip < 0) skip = 0;

        if (createdByUserId is int cb && cb > 0 && !await MayListRoutesUploadedByUserAsync(cb, ct))
            return Ok(new { items = Array.Empty<object>(), total = 0, skip, take });

        double? userLat = null;
        double? userLng = null;
        if (nearLat is { } nla && nearLng is { } nlo
            && !double.IsNaN(nla) && !double.IsNaN(nlo)
            && nla is >= -90 and <= 90 && nlo is >= -180 and <= 180)
        {
            userLat = nla;
            userLng = nlo;
        }

        var useNear = userLat.HasValue && userLng.HasValue;

        var query = db.Routes.AsNoTracking().Include(r => r.CreatedBy).AsQueryable();

        if (createdByUserId is > 0)
            query = query.Where(r => r.CreatedByUserId == createdByUserId.Value);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim();
            query = query.Where(r =>
                r.Title.Contains(term)
                || (r.CreatedBy != null && r.CreatedBy.UserName != null && r.CreatedBy.UserName.Contains(term))
                || (r.CreatedBy != null && r.CreatedBy.FirstName != null && r.CreatedBy.FirstName.Contains(term))
                || (r.CreatedBy != null && r.CreatedBy.LastName != null && r.CreatedBy.LastName.Contains(term)));
        }

        if (!string.IsNullOrWhiteSpace(terrain) && !string.Equals(terrain, "all", StringComparison.OrdinalIgnoreCase))
            query = query.Where(r => r.Terrain == terrain);

        if (!string.IsNullOrWhiteSpace(difficulty) && !string.Equals(difficulty, "all", StringComparison.OrdinalIgnoreCase))
            query = query.Where(r => r.Difficulty == difficulty);

        if (!string.IsNullOrWhiteSpace(distance) && !string.Equals(distance, "all", StringComparison.OrdinalIgnoreCase))
        {
            query = distance.ToLowerInvariant() switch
            {
                "short" => query.Where(r => r.DistanceKm < 20),
                "medium" => query.Where(r => r.DistanceKm >= 20 && r.DistanceKm <= 50),
                "long" => query.Where(r => r.DistanceKm > 50),
                _ => query,
            };
        }

        // Near-me: EF Core cannot translate Haversine OrderBy/Where to SQL Server; filter in SQL, sort by distance in memory.
        if (useNear)
        {
            query = query.Where(r => r.StartLatitude != null && r.StartLongitude != null);
            var rows = query.ToList();
            var uLat = userLat!.Value;
            var uLng = userLng!.Value;

            var withDist = rows
                .Select(r => (
                    Route: r,
                    Dist: GeoDistance.HaversineKm(uLat, uLng, r.StartLatitude!.Value, r.StartLongitude!.Value)))
                .Where(x => maxKm is not > 0 || x.Dist <= maxKm!.Value)
                .OrderBy(x => x.Dist)
                .ToList();

            var total = withDist.Count;
            var pageSlice = withDist.Skip(skip).Take(take).ToList();
            var nearRouteIds = pageSlice.Select(x => x.Route.Id).ToList();
            var countMapNear = await RouteJsonMapper.LoadRouteRiderTotalCountsByRouteIdAsync(db, nearRouteIds, ct);
            var favMapNear = await RouteJsonMapper.LoadFavoriteCountsByRouteIdAsync(db, nearRouteIds, ct);
            var items = pageSlice
                .Select(x =>
                {
                    var tc = countMapNear.GetValueOrDefault(x.Route.Id, 0);
                    var rr = new RouteRidersInfo(tc, Array.Empty<RouteRiderVisible>());
                    return RouteJsonMapper.ToClientRoute(
                        x.Route,
                        x.Route.CreatedBy,
                        false,
                        rr,
                        Math.Round(x.Dist, 2),
                        favMapNear.GetValueOrDefault(x.Route.Id, 0));
                })
                .ToList();
            return Ok(new { items, total, skip, take });
        }

        var sortKey = (sort ?? "newest").Trim();
        if (string.Equals(sortKey, "favorites", StringComparison.OrdinalIgnoreCase))
        {
            query = query
                .OrderByDescending(r => db.SavedRoutes.Count(s => s.RouteId == r.Id))
                .ThenByDescending(r => r.CreatedAt);
        }
        else
        {
            query = query.OrderByDescending(r => r.CreatedAt);
        }

        var page = Pagination.PageQueryable(query, skip, take);
        var listRouteIds = page.Items.Select(r => r.Id).ToList();
        var countMap = await RouteJsonMapper.LoadRouteRiderTotalCountsByRouteIdAsync(db, listRouteIds, ct);
        var favMap = await RouteJsonMapper.LoadFavoriteCountsByRouteIdAsync(db, listRouteIds, ct);
        var itemsDefault = page.Items
            .Select(r =>
            {
                var tc = countMap.GetValueOrDefault(r.Id, 0);
                var rr = new RouteRidersInfo(tc, Array.Empty<RouteRiderVisible>());
                return RouteJsonMapper.ToClientRoute(r, r.CreatedBy, false, rr, null, favMap.GetValueOrDefault(r.Id, 0));
            })
            .ToList();
        return Ok(new { items = itemsDefault, total = page.Total, skip = page.Skip, take = page.Take });
    }

    /// <summary>Full &quot;who rode this route&quot; roster (names respect preferences). List responses only include counts; call this once when the UI needs names.</summary>
    [HttpGet("{routeId:int}/rider-roster")]
    [AllowAnonymous]
    public async Task<IActionResult> GetRiderRoster(int routeId, CancellationToken ct)
    {
        if (!await db.Routes.AsNoTracking().AnyAsync(r => r.Id == routeId, ct))
            return NotFound();

        var info = await RouteJsonMapper.LoadRouteRidersInfoAsync(db, routeId, ct);
        return Ok(new
        {
            totalCount = info.TotalCount,
            visibleRiders = info.Visible.Select(v => new { userId = v.UserId, fullName = v.FullName, avatarUrl = v.AvatarUrl }).ToList(),
        });
    }

    [HttpGet("{routeId:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(int routeId, CancellationToken ct)
    {
        var r = await db.Routes.AsNoTracking().Include(x => x.CreatedBy).FirstOrDefaultAsync(x => x.Id == routeId, ct);
        if (r == null) return NotFound();
        var uid = GetUserId();
        var saved = uid.HasValue && await db.SavedRoutes.AnyAsync(s => s.UserId == uid && s.RouteId == routeId, ct);
        var ridersInfo = await RouteJsonMapper.LoadRouteRidersInfoAsync(db, routeId, ct);
        var favoriteCount = await db.SavedRoutes.AsNoTracking().CountAsync(s => s.RouteId == routeId, ct);
        return Ok(RouteJsonMapper.ToClientRoute(r, r.CreatedBy, saved, ridersInfo, null, favoriteCount));
    }

    [HttpPost("upload")]
    [Authorize]
    [RequestSizeLimit(52_428_800)]
    public async Task<IActionResult> Upload(CancellationToken ct)
    {
        var form = await Request.ReadFormAsync(ct);
        var file = form.Files.GetFile("gpxFile") ?? form.Files.FirstOrDefault();
        if (file == null || file.Length == 0)
            return Problem(statusCode: 400, detail: "gpxFile is required.");

        await using var ms = new MemoryStream();
        await file.CopyToAsync(ms, ct);
        var bytes = ms.ToArray();

        string Str(string key) => form[key].ToString();
        int Int(string key, int d) => int.TryParse(form[key], out var v) ? v : d;

        if (!GpxTrackParser.TryParse(bytes, out var parsedPreview, out var distanceKm, out var elevationGainM, out _, out var derivedSrc, out var startLat, out var startLng))
            return Problem(statusCode: 400, detail: "GPX must contain a readable track with at least two points.");

        if (!GpxTrackParser.IsTrackPlausible(bytes, out var rejectReason))
            return Problem(statusCode: 400, detail: rejectReason ?? "This GPX file failed validation.");

        var previewJson = parsedPreview;
        var parserDurationSource = derivedSrc;

        var uidOpt = GetUserId();
        if (uidOpt is not { } uid)
            return Unauthorized();

        var route = new RouteEntity
        {
            Title = Str("title").Trim(),
            Description = Str("description"),
            Terrain = string.IsNullOrWhiteSpace(Str("terrain")) ? "mixed" : Str("terrain"),
            Difficulty = string.IsNullOrWhiteSpace(Str("difficulty")) ? "moderate" : Str("difficulty"),
            Region = string.IsNullOrWhiteSpace(Str("region")) ? null : Str("region"),
            StartLatitude = startLat,
            StartLongitude = startLng,
            DistanceKm = distanceKm,
            ElevationGainM = elevationGainM,
            EstimatedDurationMinutes = Int("estimatedDurationMinutes", Int("durationMinutes", 60)),
            EstimatedDurationSource = ResolveEstimatedDurationSource(Request.Form, parserDurationSource),
            WarningsJson = string.IsNullOrWhiteSpace(Str("warnings")) ? "[]" : Str("warnings"),
            Notes = string.IsNullOrWhiteSpace(Str("notes")) ? null : Str("notes"),
            GpxBlob = bytes,
            GpxReference = $"routes/upload-{Guid.NewGuid():N}.gpx",
            PreviewCoordinatesJson = previewJson,
            CreatedByUserId = uid,
            CreatedAt = DateTime.UtcNow,
            Status = "published",
        };
        if (string.IsNullOrWhiteSpace(route.Title))
            return Problem(statusCode: 400, detail: "title is required.");

        db.Routes.Add(route);
        await db.SaveChangesAsync(ct);
        var creator = await db.Users.AsNoTracking().FirstAsync(u => u.Id == uid, ct);
        return Ok(RouteJsonMapper.ToClientRoute(route, creator, false));
    }

    [HttpGet("my")]
    [Authorize]
    public async Task<IActionResult> Mine([FromQuery] int skip = 0, [FromQuery] int take = 20, CancellationToken ct = default)
    {
        var uidOpt = GetUserId();
        if (uidOpt is not { } uid)
            return Unauthorized();

        var query = db.Routes.AsNoTracking().Include(r => r.CreatedBy).Where(r => r.CreatedByUserId == uid).OrderByDescending(r => r.CreatedAt);
        var page = Pagination.PageQueryable(query, skip, take);
        var myRouteIds = page.Items.Select(r => r.Id).ToList();
        var favMap = await RouteJsonMapper.LoadFavoriteCountsByRouteIdAsync(db, myRouteIds, ct);
        var items = page.Items
            .Select(r => RouteJsonMapper.ToClientRoute(r, r.CreatedBy, false, null, null, favMap.GetValueOrDefault(r.Id, 0)))
            .ToList();
        return Ok(new { items, total = page.Total, skip = page.Skip, take = page.Take });
    }

    [HttpGet("saved")]
    [Authorize]
    public async Task<IActionResult> Saved([FromQuery] int skip = 0, [FromQuery] int take = 20, CancellationToken ct = default)
    {
        var uidOpt = GetUserId();
        if (uidOpt is not { } uid)
            return Unauthorized();

        var query = from s in db.SavedRoutes
            join r in db.Routes.Include(x => x.CreatedBy) on s.RouteId equals r.Id
            where s.UserId == uid
            orderby r.Title
            select r;
        var page = Pagination.PageQueryable(query, skip, take);
        var savedRouteIds = page.Items.Select(r => r.Id).ToList();
        var favMap = await RouteJsonMapper.LoadFavoriteCountsByRouteIdAsync(db, savedRouteIds, ct);
        var items = page.Items
            .Select(r => RouteJsonMapper.ToClientRoute(r, r.CreatedBy, true, null, null, favMap.GetValueOrDefault(r.Id, 0)))
            .ToList();
        return Ok(new { items, total = page.Total, skip = page.Skip, take = page.Take });
    }

    [HttpPost("{routeId:int}/save")]
    [Authorize]
    public async Task<IActionResult> Save(int routeId, CancellationToken ct)
    {
        var uidOpt = GetUserId();
        if (uidOpt is not { } uid)
            return Unauthorized();

        if (!await db.Routes.AnyAsync(r => r.Id == routeId, ct))
            return NotFound();
        if (!await db.SavedRoutes.AnyAsync(s => s.UserId == uid && s.RouteId == routeId, ct))
            db.SavedRoutes.Add(new SavedRoute { UserId = uid, RouteId = routeId });
        await db.SaveChangesAsync(ct);
        return Ok(new { routeId, saved = true });
    }

    [HttpDelete("{routeId:int}/save")]
    [Authorize]
    public async Task<IActionResult> Unsave(int routeId, CancellationToken ct)
    {
        var uidOpt = GetUserId();
        if (uidOpt is not { } uid)
            return Unauthorized();

        var row = await db.SavedRoutes.FirstOrDefaultAsync(s => s.UserId == uid && s.RouteId == routeId, ct);
        if (row != null)
        {
            db.SavedRoutes.Remove(row);
            await db.SaveChangesAsync(ct);
        }
        return NoContent();
    }

    private int? GetUserId()
    {
        var s = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(s, out var id) ? id : null;
    }

    /// <summary>Explore filter by uploader respects <see cref="UserPreference.PublicUploadedRoutesOnProfile"/> (owner always sees own).</summary>
    private async Task<bool> MayListRoutesUploadedByUserAsync(int createdByUserId, CancellationToken ct)
    {
        if (GetUserId() is int v && v == createdByUserId) return true;
        var pref = await db.UserPreferences.AsNoTracking()
            .FirstOrDefaultAsync(x => x.UserId == createdByUserId, ct);
        return pref is not { PublicUploadedRoutesOnProfile: false };
    }

    /// <summary>Prefer a valid client hint; otherwise use GPX parser default (timestamps vs pace).</summary>
    private static string ResolveEstimatedDurationSource(IFormCollection form, string parserDefault)
    {
        var client = form["estimatedDurationSource"].ToString().Trim();
        string[] allowed =
        [
            RouteDurationSource.GpxTimestamps,
            RouteDurationSource.EstimatedPace,
            RouteDurationSource.Estimated,
            RouteDurationSource.User,
            RouteDurationSource.Unknown,
        ];
        if (!string.IsNullOrEmpty(client) && allowed.Contains(client))
        {
            // Do not trust a client claim of recording-based duration if the GPX file did not yield timestamps.
            if (client == RouteDurationSource.GpxTimestamps && parserDefault != RouteDurationSource.GpxTimestamps)
                return string.IsNullOrEmpty(parserDefault) ? RouteDurationSource.Unknown : parserDefault;
            return client;
        }

        return string.IsNullOrEmpty(parserDefault) ? RouteDurationSource.Unknown : parserDefault;
    }
}
