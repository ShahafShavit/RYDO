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
public class AccountController(RydoDbContext db, UserManager<ApplicationUser> users, ILeaderboardService leaderboards) : ControllerBase
{
    private static readonly HashSet<string> AllowedColorSchemes =
    [
        "midnight", "evergreen", "abyss", "daylight", "sage", "dune",
    ];

    private static string NormalizeColorScheme(string? value) =>
        value != null && AllowedColorSchemes.Contains(value) ? value : "midnight";

    [HttpGet("profile")]
    public async Task<IActionResult> Profile(CancellationToken ct)
    {
        var u = await GetUserAsync(ct);
        if (u == null) return Unauthorized();
        var roles = await users.GetRolesAsync(u);
        var pref = await db.UserPreferences.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == u.Id, ct);
        var badges = await leaderboards.GetUserTopThreeBadgesAsync(u.Id, ct);
        return Ok(UserProfileResponse.Full(u, roles, pref, badges));
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
        bool PublicAvatarUrl,
        bool PublicDefaultBikeType);

    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] ProfileUpdate body, CancellationToken ct)
    {
        var u = await GetUserAsync(ct);
        if (u == null) return Unauthorized();
        u.FirstName = body.FirstName;
        u.LastName = body.LastName;
        u.Bio = string.IsNullOrWhiteSpace(body.Bio) ? null : body.Bio.Trim();
        u.Location = string.IsNullOrWhiteSpace(body.Location) ? null : body.Location.Trim();
        {
            var t = body.AvatarUrl?.Trim() ?? "";
            if (string.IsNullOrEmpty(t))
            {
                u.AvatarUrl = null;
                u.AvatarImageBytes = null;
                u.AvatarImageContentType = null;
            }
            else if (AvatarUrls.MatchesUserUploadedPath(t, u.Id) && u.AvatarImageBytes is { Length: > 0 })
            {
                /* keep uploaded avatar */
            }
            else if (AvatarUrls.IsExternalHttpUrl(t))
            {
                u.AvatarUrl = t;
                u.AvatarImageBytes = null;
                u.AvatarImageContentType = null;
            }
            else
            {
                return Problem(statusCode: 400, detail: "Avatar must be an http(s) image URL, or clear the field and upload a file.");
            }
        }
        u.PublicFirstName = body.PublicFirstName;
        u.PublicLastName = body.PublicLastName;
        u.PublicEmail = body.PublicEmail;
        u.PublicCreatedAt = body.PublicCreatedAt;
        u.PublicBio = body.PublicBio;
        u.PublicLocation = body.PublicLocation;
        u.PublicAvatarUrl = body.PublicAvatarUrl;
        u.PublicDefaultBikeType = body.PublicDefaultBikeType;
        await users.SetEmailAsync(u, body.Email);
        await users.SetUserNameAsync(u, body.Email);
        await users.UpdateAsync(u);
        var roles = await users.GetRolesAsync(u);
        var pref = await db.UserPreferences.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == u.Id, ct);
        var badges = await leaderboards.GetUserTopThreeBadgesAsync(u.Id, ct);
        return Ok(UserProfileResponse.Full(u, roles, pref, badges));
    }

    [HttpPost("avatar/upload")]
    [RequestSizeLimit(AvatarImageProcessor.MaxUploadBytes)]
    public async Task<IActionResult> UploadAvatar(CancellationToken ct)
    {
        var uid = GetUserId();
        if (uid == null) return Unauthorized();

        var form = await Request.ReadFormAsync(ct);
        var file = form.Files.GetFile("file") ?? form.Files.FirstOrDefault();
        if (file == null || file.Length == 0)
            return Problem(statusCode: 400, detail: "file is required.");

        await using var ms = new MemoryStream();
        await file.CopyToAsync(ms, ct);
        var (bytes, contentType, err) = AvatarImageProcessor.TryProcessUpload(ms.ToArray());
        if (err != null)
            return Problem(statusCode: 400, detail: err);

        var u = await users.Users.FirstOrDefaultAsync(x => x.Id == uid.Value, ct);
        if (u == null) return Unauthorized();

        u.AvatarImageBytes = bytes;
        u.AvatarImageContentType = contentType;
        u.AvatarUrl = null;
        await users.UpdateAsync(u);

        return Ok(new { avatarUrl = AvatarUrls.UserUploaded(u.Id) });
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
            publicInRouteRiderLists = p.PublicInRouteRiderLists,
            publicUploadedRoutesOnProfile = p.PublicUploadedRoutesOnProfile,
            publicParticipatedRidesOnProfile = p.PublicParticipatedRidesOnProfile,
            publicFriendsListOnProfile = p.PublicFriendsListOnProfile,
            publicInOthersFriendsLists = p.PublicInOthersFriendsLists,
            colorScheme = NormalizeColorScheme(p.ColorScheme),
        });
    }

    public record PreferencesUpdate(
        string DefaultBikeType,
        string DistanceUnit,
        bool NotificationsEnabled,
        bool? PublicInRouteRiderLists,
        bool? PublicUploadedRoutesOnProfile,
        bool? PublicParticipatedRidesOnProfile,
        bool? PublicFriendsListOnProfile,
        bool? PublicInOthersFriendsLists,
        string? ColorScheme);

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
        if (body.PublicInRouteRiderLists.HasValue)
            p.PublicInRouteRiderLists = body.PublicInRouteRiderLists.Value;
        if (body.PublicUploadedRoutesOnProfile.HasValue)
            p.PublicUploadedRoutesOnProfile = body.PublicUploadedRoutesOnProfile.Value;
        if (body.PublicParticipatedRidesOnProfile.HasValue)
            p.PublicParticipatedRidesOnProfile = body.PublicParticipatedRidesOnProfile.Value;
        if (body.PublicFriendsListOnProfile.HasValue)
            p.PublicFriendsListOnProfile = body.PublicFriendsListOnProfile.Value;
        if (body.PublicInOthersFriendsLists.HasValue)
            p.PublicInOthersFriendsLists = body.PublicInOthersFriendsLists.Value;
        if (body.ColorScheme != null)
            p.ColorScheme = NormalizeColorScheme(body.ColorScheme);
        await db.SaveChangesAsync(ct);
        return Ok(new
        {
            defaultBikeType = p.DefaultBikeType,
            distanceUnit = p.DistanceUnit,
            notificationsEnabled = p.NotificationsEnabled,
            publicInRouteRiderLists = p.PublicInRouteRiderLists,
            publicUploadedRoutesOnProfile = p.PublicUploadedRoutesOnProfile,
            publicParticipatedRidesOnProfile = p.PublicParticipatedRidesOnProfile,
            publicFriendsListOnProfile = p.PublicFriendsListOnProfile,
            publicInOthersFriendsLists = p.PublicInOthersFriendsLists,
            colorScheme = NormalizeColorScheme(p.ColorScheme),
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
