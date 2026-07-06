using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Rydo.Api.Services;

namespace Rydo.Api.Controllers;

[ApiController]
[Route("api/hazards")]
public class HazardsController(HazardService hazards) : ControllerBase
{
    public record VoteHazardBody(int RideId, double Latitude, double Longitude, int Value);

    [HttpPut("{hazardId:int}/vote")]
    [Authorize]
    public async Task<IActionResult> Vote(int hazardId, [FromBody] VoteHazardBody body, CancellationToken ct)
    {
        var uid = CurrentUserId();
        if (uid == null) return Unauthorized();

        var (hazard, userVote, error) = await hazards.VoteAsync(
            hazardId,
            body.RideId,
            uid.Value,
            body.Latitude,
            body.Longitude,
            body.Value,
            ct);

        if (error != null)
        {
            if (error is "Hazard not found." or "Ride not found.")
                return NotFound(new { detail = error });
            return Problem(statusCode: 400, detail: error);
        }

        return Ok(new
        {
            id = hazard!.Id,
            score = hazard.Score,
            status = hazard.Status,
            userVote,
        });
    }

    private int? CurrentUserId()
    {
        var s = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(s, out var id) ? id : null;
    }
}
