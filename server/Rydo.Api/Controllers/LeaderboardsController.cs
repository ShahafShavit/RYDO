using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Rydo.Api.Services;

namespace Rydo.Api.Controllers;

[ApiController]
[Route("api/leaderboards")]
[Authorize]
public class LeaderboardsController(ILeaderboardService leaderboards) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct) =>
        Ok(await leaderboards.GetSummariesAsync(LeaderboardService.DefaultTopN, ct));
}
