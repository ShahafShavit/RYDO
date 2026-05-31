using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Net.Http.Headers;
using Rydo.Api.Data;
using Rydo.Api.Services;

namespace Rydo.Api.Controllers;

[ApiController]
[Route("api/media")]
public class MediaController(RydoDbContext db, IUserHandleService handles) : ControllerBase
{
    [HttpGet("users/{handle}/avatar")]
    [AllowAnonymous]
    public async Task<IActionResult> UserAvatar(string handle, CancellationToken ct)
    {
        var normalized = handles.Normalize(handle);
        if (normalized == null) return NotFound();

        var u = await db.Users.AsNoTracking()
            .Where(x => x.Handle == normalized)
            .Select(x => new { x.AvatarImageBytes, x.AvatarImageContentType })
            .FirstOrDefaultAsync(ct);
        if (u?.AvatarImageBytes is not { Length: > 0 })
            return NotFound();

        return FileWithCaching(u.AvatarImageBytes, u.AvatarImageContentType ?? "image/webp");
    }

    [HttpGet("clubs/{clubId:int}/avatar")]
    [AllowAnonymous]
    public async Task<IActionResult> ClubAvatar(int clubId, CancellationToken ct)
    {
        var row = await db.CyclingClubs.AsNoTracking()
            .Where(c => c.Id == clubId)
            .Select(c => new { c.AvatarImageBytes, c.AvatarImageContentType })
            .FirstOrDefaultAsync(ct);
        if (row?.AvatarImageBytes is not { Length: > 0 })
            return NotFound();

        return FileWithCaching(row.AvatarImageBytes, row.AvatarImageContentType ?? "image/webp");
    }

    private IActionResult FileWithCaching(byte[] bytes, string contentType)
    {
        var etag = AvatarImageProcessor.ETagForBytes(bytes);
        if (Request.Headers.TryGetValue(HeaderNames.IfNoneMatch, out var inm))
        {
            foreach (var v in inm)
            {
                if (string.Equals(v, etag, StringComparison.Ordinal))
                    return StatusCode(StatusCodes.Status304NotModified);
            }
        }

        Response.Headers.CacheControl = "public, max-age=86400";
        Response.Headers.ETag = etag;
        return File(bytes, contentType);
    }
}
