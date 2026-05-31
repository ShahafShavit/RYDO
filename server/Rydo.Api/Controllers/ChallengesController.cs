using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;

namespace Rydo.Api.Controllers;

[ApiController]
[Route("api/challenges")]
public class ChallengesController(RydoDbContext db) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var list = await db.ChallengeInstances.AsNoTracking()
            .Where(c => c.Kind == ChallengeKind.Quest
                        && c.Status == ChallengeInstanceStatus.Published
                        && c.IsActive
                        && c.EndDate >= now)
            .OrderBy(c => c.EndDate)
            .ToListAsync(ct);
        var items = list.Select(c => new
        {
            id = c.Id,
            title = c.Title,
            description = c.Description,
            targetValue = c.TargetValue,
            currentValue = 0,
            unit = c.Unit,
            startDate = c.StartDate.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
            endDate = c.EndDate.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
            isActive = c.IsActive,
        }).ToList();
        return Ok(items);
    }
}
