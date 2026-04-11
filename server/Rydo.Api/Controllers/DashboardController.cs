using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;

namespace Rydo.Api.Controllers;

[ApiController]
[Route("dashboard")]
[Authorize]
public class DashboardController(RydoDbContext db) : ControllerBase
{
    [HttpGet("summary")]
    public async Task<IActionResult> Summary(CancellationToken ct)
    {
        return Ok(new
        {
            totalRoutes = await db.Routes.CountAsync(ct),
            totalRides = await db.RideGroups.CountAsync(ct),
            totalUsers = await db.Users.CountAsync(ct),
        });
    }
}
