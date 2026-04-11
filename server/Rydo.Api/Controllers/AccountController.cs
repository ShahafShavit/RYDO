using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;

namespace Rydo.Api.Controllers;

[ApiController]
[Route("account")]
[Authorize]
public class AccountController(RydoDbContext db, UserManager<ApplicationUser> users) : ControllerBase
{
    [HttpGet("profile")]
    public async Task<IActionResult> Profile(CancellationToken ct)
    {
        var u = await GetUserAsync(ct);
        if (u == null) return Unauthorized();
        var roles = await users.GetRolesAsync(u);
        return Ok(ProfileDto(u, roles));
    }

    public record ProfileUpdate(string FirstName, string LastName, string Email);

    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] ProfileUpdate body, CancellationToken ct)
    {
        var u = await GetUserAsync(ct);
        if (u == null) return Unauthorized();
        u.FirstName = body.FirstName;
        u.LastName = body.LastName;
        await users.SetEmailAsync(u, body.Email);
        await users.SetUserNameAsync(u, body.Email);
        await users.UpdateAsync(u);
        var roles = await users.GetRolesAsync(u);
        return Ok(ProfileDto(u, roles));
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

    private static object ProfileDto(ApplicationUser u, IList<string> roles)
    {
        var role = roles.Contains("admin", StringComparer.OrdinalIgnoreCase) ? "admin" : "user";
        return new
        {
            id = u.Id,
            firstName = u.FirstName,
            lastName = u.LastName,
            email = u.Email,
            role,
            isActive = true,
            createdAt = u.CreatedAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
        };
    }

    private int? GetUserId()
    {
        var s = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(s, out var id) ? id : null;
    }
}
