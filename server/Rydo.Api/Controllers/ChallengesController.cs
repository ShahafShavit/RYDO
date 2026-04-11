using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;

namespace Rydo.Api.Controllers;

[ApiController]
[Route("challenges")]
public class ChallengesController(RydoDbContext db) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var list = await db.Challenges.AsNoTracking().Where(c => c.IsActive).OrderBy(c => c.Id).ToListAsync(ct);
        var items = list.Select(c => new
        {
            id = c.Id,
            title = c.Title,
            description = c.Description,
            targetValue = c.TargetValue,
            currentValue = c.CurrentValue,
            unit = c.Unit,
            startDate = c.StartDate.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
            endDate = c.EndDate.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
            isActive = c.IsActive,
        }).ToList();
        return Ok(items);
    }
}
