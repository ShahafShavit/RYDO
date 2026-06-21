using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
using Rydo.Api.Services;

namespace Rydo.Api.Controllers;

[ApiController]
[Route("api/live-entry")]
public class LiveEntryController(
    LiveEntryService liveEntry,
    LiveEntryBoothTokenService boothTokens,
    IOptionsMonitor<DemoLiveEntryOptions> options,
    IConfiguration configuration,
    IHostEnvironment environment) : ControllerBase
{
    public const string RateLimitPolicy = "LiveEntry";

    public record BoothTokenBody(string BoothToken);
    public record EntryTokenBody(string EntryToken);

    [HttpGet("preview")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicy)]
    public async Task<IActionResult> Preview([FromQuery] string? g, CancellationToken ct)
    {
        if (!liveEntry.IsEnabled)
            return Problem(statusCode: 503, title: "Disabled", detail: "Live entry is not enabled.");

        if (!boothTokens.TryValidate(g, out _))
            return Problem(statusCode: 401, title: "Unauthorized", detail: "Invalid or expired booth link.");

        var preview = await liveEntry.GetPreviewAsync(ct);
        if (preview == null)
            return Problem(statusCode: 404, title: "Not found", detail: "Demo ride is not configured.");

        return Ok(new
        {
            rideId = preview.RideId,
            rideName = preview.RideName,
            routeTitle = preview.RouteTitle,
            scheduledDate = preview.ScheduledDate.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
        });
    }

    [HttpPost("challenge")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicy)]
    public async Task<IActionResult> Challenge([FromBody] BoothTokenBody body, CancellationToken ct)
    {
        if (!liveEntry.IsEnabled)
            return Problem(statusCode: 503, title: "Disabled", detail: "Live entry is not enabled.");

        var booth = (body.BoothToken ?? "").Trim();
        if (!boothTokens.TryValidate(booth, out _))
            return Problem(statusCode: 401, title: "Unauthorized", detail: "Invalid or expired booth link.");

        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var (token, expiresAt) = await liveEntry.CreateChallengeAsync(ip, ct);
        return Ok(new
        {
            entryToken = token,
            expiresAt = expiresAt.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
        });
    }

    [HttpPost("redeem")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicy)]
    public async Task<IActionResult> Redeem([FromBody] EntryTokenBody body, CancellationToken ct)
    {
        if (!liveEntry.IsEnabled)
            return Problem(statusCode: 503, title: "Disabled", detail: "Live entry is not enabled.");

        var entry = (body.EntryToken ?? "").Trim();
        if (string.IsNullOrEmpty(entry))
            return BadRequest();

        try
        {
            var result = await liveEntry.RedeemAsync(entry, ct);
            return Ok(new
            {
                token = result.Token,
                rideId = result.RideId,
                riderIndex = result.RiderIndex,
                user = new
                {
                    id = result.UserId,
                    firstName = result.FirstName,
                    lastName = result.LastName,
                    email = result.Email,
                    avatarUrl = result.AvatarUrl,
                    role = result.Role,
                    isActive = true,
                },
            });
        }
        catch (LiveEntryException ex)
        {
            return Problem(statusCode: ex.StatusCode, title: "Live entry failed", detail: ex.Message);
        }
    }

    [HttpGet("booth-url")]
    [Authorize(Roles = "admin")]
    public IActionResult BoothUrl()
    {
        if (!liveEntry.IsEnabled)
            return Problem(statusCode: 503, title: "Disabled", detail: "Live entry is not enabled.");

        var opt = options.CurrentValue;
        var expiresAt = DateTime.UtcNow.AddDays(opt.BoothTokenTtlDays);
        var g = boothTokens.Sign(expiresAt);
        var clientOrigin = configuration["Rydo:ClientOrigin"]?.Trim().TrimEnd('/');
        if (string.IsNullOrEmpty(clientOrigin))
        {
            clientOrigin = environment.IsDevelopment()
                ? "http://localhost:5173"
                : $"{Request.Scheme}://{Request.Host.Value}";
        }

        var joinPath = $"/join/live?g={Uri.EscapeDataString(g)}";
        var joinUrl = clientOrigin + joinPath;
        return Ok(new
        {
            boothToken = g,
            joinUrl,
            joinPath,
            expiresAt = expiresAt.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
            validDays = opt.BoothTokenTtlDays,
        });
    }
}
