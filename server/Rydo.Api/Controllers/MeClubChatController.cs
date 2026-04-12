using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;
using Rydo.Api.Services;

namespace Rydo.Api.Controllers;

[ApiController]
[Route("api/users/me/club-chat")]
[Authorize]
public class MeClubChatController(RydoDbContext db) : ControllerBase
{
    private int? CurrentUserId()
    {
        var s = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(s, out var id) ? id : null;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> Summary(CancellationToken ct)
    {
        var uid = CurrentUserId();
        if (uid == null) return Unauthorized();

        var clubIds = await db.ClubMembers.AsNoTracking()
            .Where(m => m.UserId == uid.Value && m.MembershipStatus == ClubMembershipStatus.Active)
            .Select(m => m.ClubId)
            .ToListAsync(ct);

        var result = new List<object>();
        foreach (var clubId in clubIds.OrderBy(c => c))
        {
            var club = await db.CyclingClubs.AsNoTracking().FirstOrDefaultAsync(c => c.Id == clubId, ct);
            if (club == null) continue;

            var read = await db.ClubChatReadStates.AsNoTracking()
                .FirstOrDefaultAsync(r => r.ClubId == clubId && r.UserId == uid.Value, ct);
            var lastReadId = read?.LastReadMessageId;

            var unread = await db.ClubChatMessages.AsNoTracking()
                .CountAsync(m => m.ClubId == clubId && (lastReadId == null || m.Id > lastReadId), ct);

            var lastMsg = await db.ClubChatMessages.AsNoTracking()
                .Where(m => m.ClubId == clubId)
                .OrderByDescending(m => m.Id)
                .Select(m => new { m.Body, m.SentAt })
                .FirstOrDefaultAsync(ct);

            var preview = lastMsg == null
                ? (string?)null
                : (lastMsg.Body.Length > 120 ? lastMsg.Body[..120] + "…" : lastMsg.Body);

            result.Add(new
            {
                clubId,
                clubName = club.Name,
                clubAvatarUrl = club.AvatarUrl,
                unreadCount = unread,
                lastMessagePreview = preview,
                lastMessageAt = lastMsg == null
                    ? (string?)null
                    : lastMsg.SentAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
            });
        }

        return Ok(result);
    }
}
