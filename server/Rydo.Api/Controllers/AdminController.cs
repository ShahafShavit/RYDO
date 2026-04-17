using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Rydo.Api;
using Rydo.Api.Data;
using Rydo.Api.Services;

namespace Rydo.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "admin")]
public class AdminController(RydoDbContext db, UserManager<ApplicationUser> users, IOptions<RydoOptions> rydoOptions) : ControllerBase
{
    [HttpGet("summary")]
    public async Task<IActionResult> Summary(CancellationToken ct)
    {
        var liveHazards = await db.Hazards.CountAsync(h => h.Status == "active", ct);
        return Ok(new
        {
            totalUsers = await db.Users.CountAsync(ct),
            totalRoutes = await db.Routes.CountAsync(ct),
            liveHazards,
        });
    }

    [HttpGet("users")]
    public async Task<IActionResult> Users([FromQuery] int skip = 0, [FromQuery] int take = 20, CancellationToken ct = default)
    {
        var baseQuery = users.Users.AsNoTracking().OrderBy(u => u.Email);
        var total = await baseQuery.CountAsync(ct);
        var pageUsers = await baseQuery.Skip(skip).Take(take).ToListAsync(ct);
        var items = new List<object>();
        foreach (var u in pageUsers)
        {
            var roles = await users.GetRolesAsync(u);
            var role = roles.Contains("admin", StringComparer.OrdinalIgnoreCase) ? "admin" : "user";
            var routeCount = await db.Routes.CountAsync(r => r.CreatedByUserId == u.Id, ct);
            var rideCount = await db.RideParticipants.CountAsync(p => p.UserId == u.Id, ct);
            items.Add(new
            {
                id = u.Id,
                fullName = $"{u.FirstName} {u.LastName}".Trim(),
                email = u.Email,
                role,
                isActive = true,
                createdAt = u.CreatedAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                status = "active",
                routeCount,
                rideCount,
            });
        }
        return Ok(new { items, total, skip, take });
    }

    [HttpDelete("users/{userId:int}")]
    public async Task<IActionResult> DeleteUser(int userId, CancellationToken ct)
    {
        if (userId == GetUserId()) return Problem(statusCode: 400, detail: "Cannot delete yourself.");
        var u = await users.FindByIdAsync(userId.ToString());
        if (u == null) return NotFound();

        var email = rydoOptions.Value.SystemAdminEmail?.Trim();
        if (string.IsNullOrEmpty(email))
            email = DbSeeder.AdminEmail;

        var systemAdmin = await users.FindByEmailAsync(email);
        if (systemAdmin == null)
            return Problem(statusCode: 503, detail: "System admin account is not configured or missing. Cannot reassign routes.");

        if (userId == systemAdmin.Id)
            return Problem(statusCode: 400, detail: "Cannot delete the system admin account.");

        await db.Routes
            .Where(r => r.CreatedByUserId == userId)
            .ExecuteUpdateAsync(s => s.SetProperty(r => r.CreatedByUserId, systemAdmin.Id), ct);

        await db.InboxItems.Where(i => i.RecipientUserId == userId).ExecuteDeleteAsync(ct);
        var frIds = await db.FriendRequests.AsNoTracking()
            .Where(f => f.FromUserId == userId || f.ToUserId == userId)
            .Select(f => f.Id)
            .ToListAsync(ct);
        if (frIds.Count > 0)
            await db.InboxItems.Where(i => i.FriendRequestId != null && frIds.Contains(i.FriendRequestId.Value)).ExecuteDeleteAsync(ct);
        await db.FriendRequests.Where(f => f.FromUserId == userId || f.ToUserId == userId).ExecuteDeleteAsync(ct);
        await db.Friendships.Where(f => f.UserIdLower == userId || f.UserIdHigher == userId).ExecuteDeleteAsync(ct);

        await users.DeleteAsync(u);
        return NoContent();
    }

    [HttpGet("routes")]
    public IActionResult Routes([FromQuery] int skip = 0, [FromQuery] int take = 20)
    {
        var query = db.Routes.AsNoTracking().Include(r => r.CreatedBy).OrderByDescending(r => r.CreatedAt);
        var page = Pagination.PageQueryable(query, skip, take);
        var flat = page.Items.Select(r => new Dictionary<string, object?>
        {
            ["id"] = r.Id,
            ["title"] = r.Title,
            ["description"] = r.Description,
            ["terrain"] = r.Terrain,
            ["difficulty"] = r.Difficulty,
            ["region"] = r.Region,
            ["distanceKm"] = r.DistanceKm,
            ["elevationGainM"] = r.ElevationGainM,
            ["estimatedDurationMinutes"] = r.EstimatedDurationMinutes,
            ["durationMinutes"] = r.EstimatedDurationMinutes,
            ["estimatedDurationSource"] = r.EstimatedDurationSource,
            ["warnings"] = System.Text.Json.JsonSerializer.Deserialize<List<string>>(r.WarningsJson),
            ["notes"] = r.Notes,
            ["gpx"] = new { fileUrl = (string?)null, reference = r.GpxReference },
            ["preview"] = new { geoJson = (object?)null, coordinates = System.Text.Json.JsonSerializer.Deserialize<List<List<double>>>(r.PreviewCoordinatesJson) },
            ["createdBy"] = new { id = r.CreatedBy?.Id ?? r.CreatedByUserId, fullName = r.CreatedBy != null ? $"{r.CreatedBy.FirstName} {r.CreatedBy.LastName}".Trim() : "Unknown" },
            ["createdAt"] = r.CreatedAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
            ["isSaved"] = false,
            ["status"] = r.Status,
            ["ownerName"] = r.CreatedBy != null ? $"{r.CreatedBy.FirstName} {r.CreatedBy.LastName}".Trim() : "Unknown",
        }).ToList();

        return Ok(new { items = flat, total = page.Total, skip = page.Skip, take = page.Take });
    }

    [HttpDelete("routes/{routeId:int}")]
    public async Task<IActionResult> DeleteRoute(int routeId, CancellationToken ct)
    {
        var r = await db.Routes.FirstOrDefaultAsync(x => x.Id == routeId, ct);
        if (r == null) return NotFound();
        db.Routes.Remove(r);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    public record ModerationRequest(string Status);

    [HttpPatch("routes/{routeId:int}/moderation")]
    public async Task<IActionResult> ModerateRoute(int routeId, [FromBody] ModerationRequest body, CancellationToken ct)
    {
        var r = await db.Routes.FirstOrDefaultAsync(x => x.Id == routeId, ct);
        if (r == null) return NotFound();
        r.Status = body.Status;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpGet("hazards")]
    public IActionResult Hazards([FromQuery] int skip = 0, [FromQuery] int take = 20)
    {
        var query = db.Hazards.AsNoTracking().Include(h => h.ReportedBy).OrderByDescending(h => h.ReportedAt);
        var page = Pagination.PageQueryable(query, skip, take);
        var items = page.Items.Select(HazardJson).ToList();
        return Ok(new { items, total = page.Total, skip = page.Skip, take = page.Take });
    }

    public record HazardStatusRequest(string Status);

    [HttpPatch("hazards/{hazardId:int}/status")]
    public async Task<IActionResult> HazardStatus(int hazardId, [FromBody] HazardStatusRequest body, CancellationToken ct)
    {
        var h = await db.Hazards.FirstOrDefaultAsync(x => x.Id == hazardId, ct);
        if (h == null) return NotFound();
        h.Status = body.Status;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static object HazardJson(HazardEntity h) => new
    {
        id = h.Id,
        type = h.Type,
        severity = h.Severity,
        description = h.Description,
        status = h.Status,
        location = new { lat = h.Latitude, lng = h.Longitude, region = h.Region },
        reportedAt = h.ReportedAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
        reportedBy = new { id = h.ReportedBy?.Id ?? h.ReportedByUserId, fullName = h.ReportedBy != null ? $"{h.ReportedBy.FirstName} {h.ReportedBy.LastName}".Trim() : "Unknown" },
    };

    private int? GetUserId()
    {
        var s = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(s, out var id) ? id : null;
    }
}
