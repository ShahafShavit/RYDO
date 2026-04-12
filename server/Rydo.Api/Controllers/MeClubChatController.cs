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

        var rows = new List<(
            int clubId,
            string clubName,
            string? clubAvatarUrl,
            int unread,
            int? firstUnreadMessageId,
            string? preview,
            DateTime? lastActivity)>();

        foreach (var clubId in clubIds)
        {
            var club = await db.CyclingClubs.AsNoTracking().FirstOrDefaultAsync(c => c.Id == clubId, ct);
            if (club == null) continue;

            var read = await db.ClubChatReadStates.AsNoTracking()
                .FirstOrDefaultAsync(r => r.ClubId == clubId && r.UserId == uid.Value, ct);
            var lastReadId = read?.LastReadMessageId;

            var lastMsg = await db.ClubChatMessages.AsNoTracking()
                .Where(m => m.ClubId == clubId)
                .OrderByDescending(m => m.Id)
                .Select(m => new { m.Body, m.SentAt })
                .FirstOrDefaultAsync(ct);

            // Unread = messages from other members after your read pointer (your own messages never count).
            var unread = await db.ClubChatMessages.AsNoTracking()
                .CountAsync(
                    m => m.ClubId == clubId
                        && m.AuthorUserId != uid.Value
                        && (lastReadId == null || m.Id > lastReadId),
                    ct);

            int? firstUnreadMessageId = null;
            if (unread > 0)
            {
                firstUnreadMessageId = await db.ClubChatMessages.AsNoTracking()
                    .Where(
                        m => m.ClubId == clubId
                            && m.AuthorUserId != uid.Value
                            && (lastReadId == null || m.Id > lastReadId))
                    .OrderBy(m => m.Id)
                    .Select(m => (int?)m.Id)
                    .FirstOrDefaultAsync(ct);
            }

            var preview = lastMsg == null
                ? (string?)null
                : (lastMsg.Body.Length > 120 ? lastMsg.Body[..120] + "…" : lastMsg.Body);

            rows.Add((
                clubId,
                club.Name,
                club.AvatarUrl,
                unread,
                firstUnreadMessageId,
                preview,
                lastMsg?.SentAt));
        }

        var sorted = rows
            .OrderByDescending(r => r.lastActivity ?? DateTime.MinValue)
            .Select(r => new
            {
                r.clubId,
                clubName = r.clubName,
                clubAvatarUrl = r.clubAvatarUrl,
                unreadCount = r.unread,
                firstUnreadMessageId = r.firstUnreadMessageId,
                lastMessagePreview = r.preview,
                lastMessageAt = r.lastActivity == null
                    ? (string?)null
                    : r.lastActivity.Value.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
            })
            .ToList();

        return Ok(sorted);
    }
}
