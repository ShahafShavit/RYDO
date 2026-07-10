using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Rydo.Api.Data;
using Rydo.Api.Services;
using Rydo.Api.Services.Hazards;

namespace Rydo.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "admin")]
public class AdminController(
    RydoDbContext db,
    UserManager<ApplicationUser> users,
    IOptions<RydoOptions> rydoOptions,
    IAdminEngagementAnalyticsService engagementAnalytics) : ControllerBase
{
    [HttpGet("summary")]
    public async Task<IActionResult> Summary(
        [FromQuery] bool refresh = false,
        CancellationToken ct = default)
    {
        var liveHazards = await db.Hazards.CountAsync(h => h.Status == "active", ct);
        var now = DateTime.UtcNow;
        var activeQuests = await db.ChallengeInstances.CountAsync(i =>
            i.Kind == ChallengeKind.Quest
            && i.Status == ChallengeInstanceStatus.Published
            && i.IsActive
            && i.StartDate <= now
            && i.EndDate >= now, ct);
        var activeModifiers = await db.ChallengeInstances.CountAsync(i =>
            i.Kind == ChallengeKind.Modifier
            && i.Status == ChallengeInstanceStatus.Published
            && i.IsActive
            && i.StartDate <= now
            && i.EndDate >= now, ct);
        var weekStart = now.AddDays(-7);
        var questCompletionsThisWeek = await db.UserChallengeProgress.CountAsync(p =>
            p.CompletedAt >= weekStart && p.ChallengeInstanceId != null, ct);

        var engagement = await engagementAnalytics.GetSummarySliceAsync(refresh, ct);

        return Ok(new
        {
            totalUsers = await db.Users.CountAsync(ct),
            totalRoutes = await db.Routes.CountAsync(ct),
            liveHazards,
            activeQuests,
            activeModifiers,
            questCompletionsThisWeek,
            dau = engagement.Dau,
            wau = engagement.Wau,
            mau = engagement.Mau,
            activeNow = engagement.ActiveNow,
            deltas = new
            {
                dauWoWPct = engagement.Deltas.DauWoWPct,
                wauWoWPct = engagement.Deltas.WauWoWPct,
                mauMoMPct = engagement.Deltas.MauMoMPct,
            },
        });
    }

    [HttpGet("users")]
    public async Task<IActionResult> Users(
        [FromQuery] int skip = 0,
        [FromQuery] int take = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? role = null,
        CancellationToken ct = default)
    {
        take = Math.Clamp(take, 1, 100);
        var baseQuery = users.Users.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            baseQuery = baseQuery.Where(u =>
                (u.Email != null && u.Email.Contains(term))
                || (u.Handle != null && u.Handle.Contains(term))
                || u.FirstName.Contains(term)
                || u.LastName.Contains(term));
        }

        if (!string.IsNullOrWhiteSpace(role))
        {
            var roleNorm = role.Trim().ToLowerInvariant();
            var adminRoleId = await db.Roles.AsNoTracking()
                .Where(r => r.Name == "admin")
                .Select(r => r.Id)
                .FirstOrDefaultAsync(ct);
            var adminUserIds = db.UserRoles.AsNoTracking()
                .Where(ur => ur.RoleId == adminRoleId)
                .Select(ur => ur.UserId);

            baseQuery = roleNorm == "admin"
                ? baseQuery.Where(u => adminUserIds.Contains(u.Id))
                : baseQuery.Where(u => !adminUserIds.Contains(u.Id));
        }

        var ordered = baseQuery.OrderBy(u => u.Email);
        var total = await ordered.CountAsync(ct);
        var pageUsers = await ordered.Skip(skip).Take(take).ToListAsync(ct);
        var items = new List<object>();
        foreach (var u in pageUsers)
        {
            var roles = await users.GetRolesAsync(u);
            var userRole = roles.Contains("admin", StringComparer.OrdinalIgnoreCase) ? "admin" : "user";
            var routeCount = await db.Routes.CountAsync(r => r.CreatedByUserId == u.Id, ct);
            var rideCount = await db.RideParticipants.CountAsync(p => p.UserId == u.Id, ct);
            items.Add(new
            {
                id = u.Id,
                handle = u.Handle,
                fullName = $"{u.FirstName} {u.LastName}".Trim(),
                email = u.Email,
                role = userRole,
                isActive = true,
                createdAt = u.CreatedAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                status = "active",
                routeCount,
                rideCount,
            });
        }
        return Ok(new { items, total, skip, take });
    }

    public record UserRoleRequest(string Role);

    [HttpPatch("users/{userId:int}/role")]
    public async Task<IActionResult> UpdateUserRole(int userId, [FromBody] UserRoleRequest body, CancellationToken ct)
    {
        if (userId == GetUserId())
            return Problem(statusCode: 400, detail: "Cannot change your own role.");

        var targetRole = body.Role?.Trim().ToLowerInvariant();
        if (targetRole is not ("admin" or "user"))
            return Problem(statusCode: 400, detail: "Role must be 'admin' or 'user'.");

        var u = await users.FindByIdAsync(userId.ToString());
        if (u == null) return NotFound();

        var email = rydoOptions.Value.SystemAdminEmail?.Trim();
        if (string.IsNullOrEmpty(email))
            email = DbSeeder.AdminEmail;

        var systemAdmin = await users.FindByEmailAsync(email);
        if (systemAdmin != null && userId == systemAdmin.Id && targetRole != "admin")
            return Problem(statusCode: 400, detail: "Cannot demote the system admin account.");

        var currentRoles = await users.GetRolesAsync(u);
        var isAdmin = currentRoles.Contains("admin", StringComparer.OrdinalIgnoreCase);

        if (targetRole == "admin" && !isAdmin)
            await users.AddToRoleAsync(u, "admin");
        else if (targetRole == "user" && isAdmin)
            await users.RemoveFromRoleAsync(u, "admin");

        return NoContent();
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
        await db.InboxItems.Where(i => i.ClubJoinRequesterUserId == userId).ExecuteDeleteAsync(ct);
        var frIds = await db.FriendRequests.AsNoTracking()
            .Where(f => f.FromUserId == userId || f.ToUserId == userId)
            .Select(f => f.Id)
            .ToListAsync(ct);
        if (frIds.Count > 0)
            await db.InboxItems.Where(i => i.FriendRequestId != null && frIds.Contains(i.FriendRequestId.Value)).ExecuteDeleteAsync(ct);
        await db.FriendRequests.Where(f => f.FromUserId == userId || f.ToUserId == userId).ExecuteDeleteAsync(ct);
        await db.Friendships.Where(f => f.UserIdLower == userId || f.UserIdHigher == userId).ExecuteDeleteAsync(ct);

        var rideInviteIds = await db.RideInvites.AsNoTracking()
            .Where(ri => ri.FromUserId == userId || ri.ToUserId == userId)
            .Select(ri => ri.Id)
            .ToListAsync(ct);
        if (rideInviteIds.Count > 0)
            await db.InboxItems.Where(i => i.RideInviteId != null && rideInviteIds.Contains(i.RideInviteId.Value)).ExecuteDeleteAsync(ct);
        await db.RideInvites.Where(ri => ri.FromUserId == userId || ri.ToUserId == userId).ExecuteDeleteAsync(ct);

        await users.DeleteAsync(u);
        return NoContent();
    }

    [HttpGet("routes")]
    public IActionResult Routes(
        [FromQuery] int skip = 0,
        [FromQuery] int take = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? status = null)
    {
        take = Math.Clamp(take, 1, 100);
        IQueryable<RouteEntity> query = db.Routes.AsNoTracking().Include(r => r.CreatedBy);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(r =>
                r.Title.Contains(term)
                || (r.CreatedBy != null && (r.CreatedBy.FirstName + " " + r.CreatedBy.LastName).Contains(term)));
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            var statusNorm = status.Trim().ToLowerInvariant();
            query = query.Where(r => r.Status.ToLower() == statusNorm);
        }

        query = query.OrderByDescending(r => r.CreatedAt);
        var page = Pagination.PageQueryable(query, skip, take);
        var flat = page.Items.Select(r => new Dictionary<string, object?>
        {
            ["id"] = r.Id,
            ["title"] = r.Title,
            ["description"] = r.Description,
            ["terrain"] = r.Terrain,
            ["difficulty"] = r.Difficulty,
            ["physicsDifficultyScore"] = r.PhysicsDifficultyScore,
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
    public async Task<IActionResult> Hazards(
        [FromQuery] int skip = 0,
        [FromQuery] int take = 20,
        [FromQuery] string? status = null,
        [FromQuery] string? severity = null,
        [FromQuery] string? type = null,
        CancellationToken ct = default)
    {
        take = Math.Clamp(take, 1, 100);
        IQueryable<HazardEntity> query = db.Hazards.AsNoTracking()
            .Include(h => h.ReportedBy)
            .Include(h => h.Route);

        if (!string.IsNullOrWhiteSpace(status))
        {
            var statusNorm = status.Trim().ToLowerInvariant();
            query = query.Where(h => h.Status.ToLower() == statusNorm);
        }

        if (!string.IsNullOrWhiteSpace(severity))
        {
            var severityNorm = severity.Trim().ToLowerInvariant();
            query = query.Where(h => h.Severity.ToLower() == severityNorm);
        }

        if (!string.IsNullOrWhiteSpace(type))
        {
            var typeNorm = type.Trim().ToLowerInvariant();
            query = query.Where(h => h.Type.ToLower() == typeNorm);
        }

        query = query.OrderByDescending(h => h.ReportedAt);
        var page = Pagination.PageQueryable(query, skip, take);
        var hazardIds = page.Items.Select(h => h.Id).ToList();

        var voteRows = hazardIds.Count == 0
            ? new List<HazardVote>()
            : await db.HazardVotes.AsNoTracking()
                .Include(v => v.User)
                .Where(v => hazardIds.Contains(v.HazardId))
                .OrderByDescending(v => v.UpdatedAt)
                .ToListAsync(ct);

        var votesByHazard = voteRows
            .GroupBy(v => v.HazardId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var items = page.Items
            .Select(h => HazardJson(h, votesByHazard.GetValueOrDefault(h.Id)))
            .ToList();
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

    private static object HazardJson(HazardEntity h, IReadOnlyList<HazardVote>? votes = null)
    {
        votes ??= Array.Empty<HazardVote>();
        var up = votes.Count(v => v.Value > 0);
        var down = votes.Count(v => v.Value < 0);
        var voters = votes
            .OrderByDescending(v => v.UpdatedAt)
            .Take(10)
            .Select(v => new
            {
                id = v.UserId,
                fullName = v.User != null ? $"{v.User.FirstName} {v.User.LastName}".Trim() : "Unknown",
                value = v.Value,
                updatedAt = v.UpdatedAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
            })
            .ToList();

        return new
        {
            id = h.Id,
            routeId = h.RouteId,
            routeTitle = h.Route?.Title,
            rideId = h.RideId,
            type = h.Type,
            severity = h.Severity,
            description = h.Description,
            score = h.Score,
            status = h.Status,
            userVisible = HazardVisibility.IsVisible(h),
            location = new { lat = h.Latitude, lng = h.Longitude, region = h.Region },
            reportedAt = h.ReportedAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
            reportedBy = new { id = h.ReportedBy?.Id ?? h.ReportedByUserId, fullName = h.ReportedBy != null ? $"{h.ReportedBy.FirstName} {h.ReportedBy.LastName}".Trim() : "Unknown" },
            votes = new
            {
                up,
                down,
                total = votes.Count,
                voters,
            },
        };
    }

    private int? GetUserId()
    {
        var s = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(s, out var id) ? id : null;
    }
}
