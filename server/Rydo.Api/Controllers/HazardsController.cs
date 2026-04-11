using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;

namespace Rydo.Api.Controllers;

[ApiController]
[Route("api/hazards")]
public class HazardsController(RydoDbContext db) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var list = await db.Hazards.AsNoTracking().Include(h => h.ReportedBy).OrderByDescending(h => h.ReportedAt).ToListAsync(ct);
        var items = list.Select(h => new
        {
            id = h.Id,
            type = h.Type,
            severity = h.Severity,
            description = h.Description,
            status = h.Status,
            location = new { lat = h.Latitude, lng = h.Longitude, region = h.Region },
            reportedAt = h.ReportedAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
            reportedBy = new { id = h.ReportedBy?.Id ?? h.ReportedByUserId, fullName = h.ReportedBy != null ? $"{h.ReportedBy.FirstName} {h.ReportedBy.LastName}".Trim() : "Unknown" },
        }).ToList();
        return Ok(items);
    }

    public record CreateHazard(string Type, string Description, double Latitude, double Longitude, string? Severity);

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create([FromBody] CreateHazard body, CancellationToken ct)
    {
        var uid = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
        var h = new HazardEntity
        {
            Type = body.Type,
            Description = body.Description,
            Latitude = body.Latitude,
            Longitude = body.Longitude,
            Severity = string.IsNullOrWhiteSpace(body.Severity) ? "medium" : body.Severity!,
            Status = "active",
            ReportedByUserId = uid,
            ReportedAt = DateTime.UtcNow,
        };
        db.Hazards.Add(h);
        await db.SaveChangesAsync(ct);
        await db.Entry(h).Reference(x => x.ReportedBy).LoadAsync(ct);
        return Ok(new
        {
            id = h.Id,
            type = h.Type,
            severity = h.Severity,
            description = h.Description,
            status = h.Status,
            location = new { lat = h.Latitude, lng = h.Longitude, region = h.Region },
            reportedAt = h.ReportedAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
            reportedBy = new { id = uid, fullName = h.ReportedBy != null ? $"{h.ReportedBy.FirstName} {h.ReportedBy.LastName}".Trim() : "" },
        });
    }
}
