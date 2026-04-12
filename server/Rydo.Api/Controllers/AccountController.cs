using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;
using Rydo.Api.Services;

namespace Rydo.Api.Controllers;

[ApiController]
[Route("api/account")]
[Authorize]
public class AccountController(RydoDbContext db, UserManager<ApplicationUser> users) : ControllerBase
{
    [HttpGet("profile")]
    public async Task<IActionResult> Profile(CancellationToken ct)
    {
        var u = await GetUserAsync(ct);
        if (u == null) return Unauthorized();
        var roles = await users.GetRolesAsync(u);
        return Ok(UserProfileResponse.Full(u, roles));
    }

    public record ProfileUpdate(
        string FirstName,
        string LastName,
        string Email,
        string? Bio,
        string? Location,
        string? AvatarUrl,
        bool PublicFirstName,
        bool PublicLastName,
        bool PublicEmail,
        bool PublicCreatedAt,
        bool PublicBio,
        bool PublicLocation,
        bool PublicAvatarUrl);

    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] ProfileUpdate body, CancellationToken ct)
    {
        var u = await GetUserAsync(ct);
        if (u == null) return Unauthorized();
        u.FirstName = body.FirstName;
        u.LastName = body.LastName;
        u.Bio = string.IsNullOrWhiteSpace(body.Bio) ? null : body.Bio.Trim();
        u.Location = string.IsNullOrWhiteSpace(body.Location) ? null : body.Location.Trim();
        u.AvatarUrl = string.IsNullOrWhiteSpace(body.AvatarUrl) ? null : body.AvatarUrl.Trim();
        u.PublicFirstName = body.PublicFirstName;
        u.PublicLastName = body.PublicLastName;
        u.PublicEmail = body.PublicEmail;
        u.PublicCreatedAt = body.PublicCreatedAt;
        u.PublicBio = body.PublicBio;
        u.PublicLocation = body.PublicLocation;
        u.PublicAvatarUrl = body.PublicAvatarUrl;
        await users.SetEmailAsync(u, body.Email);
        await users.SetUserNameAsync(u, body.Email);
        await users.UpdateAsync(u);
        var roles = await users.GetRolesAsync(u);
        return Ok(UserProfileResponse.Full(u, roles));
    }

    [HttpGet("preferences")]
    public async Task<IActionResult> Preferences(CancellationToken ct)
    {
        var uid = GetUserId() ?? 0;
        var p = await db.UserPreferences.FirstOrDefaultAsync(x => x.UserId == uid, ct);
        if (p == null)
        {
            p = new UserPreference { UserId = uid };
            db.UserPreferences.Add(p);
            await db.SaveChangesAsync(ct);
        }
        return Ok(new
        {
            defaultBikeType = p.DefaultBikeType,
            distanceUnit = p.DistanceUnit,
            notificationsEnabled = p.NotificationsEnabled,
        });
    }

    public record PreferencesUpdate(string DefaultBikeType, string DistanceUnit, bool NotificationsEnabled);

    [HttpPut("preferences")]
    public async Task<IActionResult> UpdatePreferences([FromBody] PreferencesUpdate body, CancellationToken ct)
    {
        var uid = GetUserId() ?? 0;
        var p = await db.UserPreferences.FirstOrDefaultAsync(x => x.UserId == uid, ct);
        if (p == null)
        {
            p = new UserPreference { UserId = uid };
            db.UserPreferences.Add(p);
        }
        p.DefaultBikeType = body.DefaultBikeType;
        p.DistanceUnit = body.DistanceUnit;
        p.NotificationsEnabled = body.NotificationsEnabled;
        await db.SaveChangesAsync(ct);
        return Ok(new
        {
            defaultBikeType = p.DefaultBikeType,
            distanceUnit = p.DistanceUnit,
            notificationsEnabled = p.NotificationsEnabled,
        });
    }

    public record PasswordUpdate(string CurrentPassword, string NewPassword);

    [HttpPut("password")]
    public async Task<IActionResult> Password([FromBody] PasswordUpdate body, CancellationToken ct)
    {
        var u = await GetUserAsync(ct);
        if (u == null) return Unauthorized();
        var result = await users.ChangePasswordAsync(u, body.CurrentPassword, body.NewPassword);
        if (!result.Succeeded)
            return Problem(statusCode: 400, detail: string.Join("; ", result.Errors.Select(e => e.Description)));
        return NoContent();
    }

    private async Task<ApplicationUser?> GetUserAsync(CancellationToken ct)
    {
        var uid = GetUserId();
        if (uid == null) return null;
        return await users.Users.FirstOrDefaultAsync(u => u.Id == uid, ct);
    }

    private int? GetUserId()
    {
        var s = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(s, out var id) ? id : null;
    }
}
