using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;

namespace Rydo.Api.Controllers;

[ApiController]
[Route("rides")]
public class RidesController(RydoDbContext db) : ControllerBase
{
    [HttpGet("groups")]
    [AllowAnonymous]
    public async Task<IActionResult> Groups(CancellationToken ct)
    {
        var groups = await db.RideGroups.AsNoTracking().Include(g => g.Participants).Include(g => g.Route).ToListAsync(ct);
        var items = groups.Select(g => new
        {
            id = g.Id,
            name = g.Name,
            description = g.Description,
            scheduledDate = g.ScheduledDate.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
            routeId = g.RouteId,
            participants = g.Participants.Select(p => p.UserId).ToList(),
            maxParticipants = g.MaxParticipants,
        }).ToList();
        return Ok(items);
    }

    public record CreateRideGroup(string Name, string Description, DateTime ScheduledDate, int RouteId, int MaxParticipants);

    [HttpPost("groups")]
    [Authorize]
    public async Task<IActionResult> CreateGroup([FromBody] CreateRideGroup body, CancellationToken ct)
    {
        if (!await db.Routes.AnyAsync(r => r.Id == body.RouteId, ct))
            return NotFound();
        var g = new RideGroup
        {
            Name = body.Name,
            Description = body.Description,
            ScheduledDate = body.ScheduledDate.ToUniversalTime(),
            RouteId = body.RouteId,
            MaxParticipants = body.MaxParticipants > 0 ? body.MaxParticipants : 20,
        };
        db.RideGroups.Add(g);
        await db.SaveChangesAsync(ct);
        return Ok(new { id = g.Id, name = g.Name, description = g.Description, scheduledDate = g.ScheduledDate, routeId = g.RouteId, participants = Array.Empty<int>(), maxParticipants = g.MaxParticipants });
    }

    [HttpGet("events/{rideId:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> Event(int rideId, CancellationToken ct)
    {
        var g = await db.RideGroups.AsNoTracking().Include(x => x.Participants).Include(x => x.Route).FirstOrDefaultAsync(x => x.Id == rideId, ct);
        if (g == null) return NotFound();
        return Ok(new
        {
            id = g.Id,
            name = g.Name,
            description = g.Description,
            scheduledDate = g.ScheduledDate.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
            routeId = g.RouteId,
            participants = g.Participants.Select(p => p.UserId).ToList(),
            maxParticipants = g.MaxParticipants,
        });
    }
}
