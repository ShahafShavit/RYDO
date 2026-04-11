using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;
using Rydo.Api.Services;

namespace Rydo.Api.Controllers;

[ApiController]
[Route("routes")]
public class RoutesController(RydoDbContext db) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public IActionResult List([FromQuery] int skip = 0, [FromQuery] int take = 20)
    {
        var query = db.Routes.AsNoTracking().Include(r => r.CreatedBy).OrderByDescending(r => r.CreatedAt);
        var page = Pagination.PageQueryable(query, skip, take);
        var items = page.Items.Select(r => RouteJsonMapper.ToClientRoute(r, r.CreatedBy, false)).ToList();
        return Ok(new { items, total = page.Total, skip = page.Skip, take = page.Take });
    }

    [HttpGet("{routeId:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(int routeId, CancellationToken ct)
    {
        var r = await db.Routes.AsNoTracking().Include(x => x.CreatedBy).FirstOrDefaultAsync(x => x.Id == routeId, ct);
        if (r == null) return NotFound();
        var uid = GetUserId();
        var saved = uid.HasValue && await db.SavedRoutes.AnyAsync(s => s.UserId == uid && s.RouteId == routeId, ct);
        return Ok(RouteJsonMapper.ToClientRoute(r, r.CreatedBy, saved));
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
        double Dbl(string key, double d) => double.TryParse(form[key], out var v) ? v : d;

        var distanceKm = Dbl("distanceKm", 0);
        var elevationGainM = Dbl("elevationGainM", 0);
        var previewJson = "[]";
        if (GpxTrackParser.TryParse(bytes, out var parsedPreview, out var pathKm, out var pathElev))
        {
            previewJson = parsedPreview;
            if (distanceKm <= 0)
                distanceKm = pathKm;
            if (elevationGainM <= 0)
                elevationGainM = pathElev;
        }

        var uid = GetUserId() ?? 0;
        var route = new RouteEntity
        {
            Title = Str("title").Trim(),
            Description = Str("description"),
            Terrain = string.IsNullOrWhiteSpace(Str("terrain")) ? "mixed" : Str("terrain"),
            Difficulty = string.IsNullOrWhiteSpace(Str("difficulty")) ? "moderate" : Str("difficulty"),
            Region = string.IsNullOrWhiteSpace(Str("region")) ? null : Str("region"),
            DistanceKm = distanceKm,
            ElevationGainM = elevationGainM,
            EstimatedDurationMinutes = Int("estimatedDurationMinutes", Int("durationMinutes", 60)),
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
    public IActionResult Mine([FromQuery] int skip = 0, [FromQuery] int take = 20)
    {
        var uid = GetUserId() ?? 0;
        var query = db.Routes.AsNoTracking().Include(r => r.CreatedBy).Where(r => r.CreatedByUserId == uid).OrderByDescending(r => r.CreatedAt);
        var page = Pagination.PageQueryable(query, skip, take);
        var items = page.Items.Select(r => RouteJsonMapper.ToClientRoute(r, r.CreatedBy, false)).ToList();
        return Ok(new { items, total = page.Total, skip = page.Skip, take = page.Take });
    }

    [HttpGet("saved")]
    [Authorize]
    public IActionResult Saved([FromQuery] int skip = 0, [FromQuery] int take = 20)
    {
        var uid = GetUserId() ?? 0;
        var query = from s in db.SavedRoutes
            join r in db.Routes.Include(x => x.CreatedBy) on s.RouteId equals r.Id
            where s.UserId == uid
            orderby r.Title
            select r;
        var page = Pagination.PageQueryable(query, skip, take);
        var items = page.Items.Select(r => RouteJsonMapper.ToClientRoute(r, r.CreatedBy, true)).ToList();
        return Ok(new { items, total = page.Total, skip = page.Skip, take = page.Take });
    }

    [HttpPost("{routeId:int}/save")]
    [Authorize]
    public async Task<IActionResult> Save(int routeId, CancellationToken ct)
    {
        var uid = GetUserId() ?? 0;
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
        var uid = GetUserId() ?? 0;
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
}
