using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;
using Rydo.Api.Hubs;
using Rydo.Api.Services;

namespace Rydo.Api.Controllers;

[ApiController]
[Route("api/clubs/{clubId:int}/chat")]
[Authorize]
public class ClubChatController(RydoDbContext db, IHubContext<ClubChatHub> hubContext) : ControllerBase
{
    private const int MaxBodyLength = 8000;
    private const int DefaultTake = 40;
    private const int MaxTake = 100;

    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    private int? CurrentUserId()
    {
        var s = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(s, out var id) ? id : null;
    }

    private static string DisplayName(ApplicationUser? u) =>
        u == null ? "" : string.Join(" ", new[] { u.FirstName, u.LastName }.Where(x => !string.IsNullOrWhiteSpace(x))).Trim();

    private async Task<bool> IsActiveMemberAsync(int clubId, int userId, CancellationToken ct) =>
        await db.ClubMembers.AsNoTracking().AnyAsync(
            m => m.ClubId == clubId && m.UserId == userId && m.MembershipStatus == ClubMembershipStatus.Active,
            ct);

    [HttpGet("messages")]
    public async Task<IActionResult> GetMessages(int clubId, [FromQuery] int? beforeMessageId, [FromQuery] int? take, CancellationToken ct)
    {
        var uid = CurrentUserId();
        if (uid == null) return Unauthorized();
        if (!await IsActiveMemberAsync(clubId, uid.Value, ct)) return Forbid();

        var n = Math.Clamp(take ?? DefaultTake, 1, MaxTake);
        var q = db.ClubChatMessages.AsNoTracking()
            .Include(m => m.Author)
            .Where(m => m.ClubId == clubId);
        if (beforeMessageId is int b)
            q = q.Where(m => m.Id < b);
        var rows = await q.OrderByDescending(m => m.Id).Take(n).ToListAsync(ct);
        rows.Reverse();
        var dtos = new List<object>();
        foreach (var m in rows)
            dtos.Add(await BuildMessageDtoAsync(m, ct));
        return Ok(dtos);
    }

    public record MentionIn(string Kind, int Id);
    public record PostClubChatRequest(string Body, List<MentionIn>? Mentions);

    [HttpPost("messages")]
    public async Task<IActionResult> PostMessage(int clubId, [FromBody] PostClubChatRequest body, CancellationToken ct)
    {
        var uid = CurrentUserId();
        if (uid == null) return Unauthorized();
        if (!await IsActiveMemberAsync(clubId, uid.Value, ct)) return Forbid();

        var text = (body.Body ?? "").Trim();
        if (text.Length == 0) return Problem(statusCode: 400, title: "Message body is required");
        if (text.Length > MaxBodyLength) return Problem(statusCode: 400, title: $"Body exceeds {MaxBodyLength} characters");

        var mentions = body.Mentions ?? [];
        var err = await ValidateMentionsAsync(clubId, uid.Value, mentions, ct);
        if (err != null) return Problem(statusCode: 400, title: err);

        string? mentionsJson = mentions.Count == 0
            ? null
            : JsonSerializer.Serialize(mentions.Select(m => new { kind = m.Kind.ToLowerInvariant(), id = m.Id }), JsonOpts);

        var msg = new ClubChatMessage
        {
            ClubId = clubId,
            AuthorUserId = uid.Value,
            Body = text,
            MentionsJson = mentionsJson,
            SentAt = DateTime.UtcNow,
        };
        db.ClubChatMessages.Add(msg);
        await db.SaveChangesAsync(ct);

        await db.Entry(msg).Reference(m => m.Author).LoadAsync(ct);
        var dto = await BuildMessageDtoAsync(msg, ct);
        await hubContext.Clients.Group(ClubChatHub.ClubGroupName(clubId)).SendAsync("ReceiveMessage", dto, ct);
        return Ok(dto);
    }

    public record MarkReadRequest(int? LastReadMessageId, bool? MarkLatest);

    [HttpPost("read")]
    public async Task<IActionResult> MarkRead(int clubId, [FromBody] MarkReadRequest body, CancellationToken ct)
    {
        var uid = CurrentUserId();
        if (uid == null) return Unauthorized();
        if (!await IsActiveMemberAsync(clubId, uid.Value, ct)) return Forbid();

        int? targetId = body.LastReadMessageId;
        if (body.MarkLatest == true || targetId == null)
        {
            targetId = await db.ClubChatMessages.AsNoTracking()
                .Where(m => m.ClubId == clubId)
                .OrderByDescending(m => m.Id)
                .Select(m => (int?)m.Id)
                .FirstOrDefaultAsync(ct);
        }

        var row = await db.ClubChatReadStates.FirstOrDefaultAsync(x => x.ClubId == clubId && x.UserId == uid.Value, ct);
        if (row == null)
        {
            row = new ClubChatReadState { ClubId = clubId, UserId = uid.Value, LastReadMessageId = targetId };
            db.ClubChatReadStates.Add(row);
        }
        else
        {
            if (targetId != null && (row.LastReadMessageId == null || targetId > row.LastReadMessageId))
                row.LastReadMessageId = targetId;
        }

        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpGet("mentionables")]
    public async Task<IActionResult> GetMentionables(int clubId, [FromQuery] string? q, CancellationToken ct)
    {
        var uid = CurrentUserId();
        if (uid == null) return Unauthorized();
        if (!await IsActiveMemberAsync(clubId, uid.Value, ct)) return Forbid();

        var needle = (q ?? "").Trim().ToLowerInvariant();
        const int cap = 40;

        var memberQuery = db.ClubMembers.AsNoTracking()
            .Where(m => m.ClubId == clubId && m.MembershipStatus == ClubMembershipStatus.Active)
            .Include(m => m.User);
        var members = await memberQuery.ToListAsync(ct);
        var users = members
            .Where(m => m.UserId != uid.Value)
            .Select(m => new
            {
                kind = "user",
                id = m.UserId,
                label = DisplayName(m.User),
                avatarUrl = UserPublicFields.RosterAvatarUrl(m.User),
            })
            .Where(x => string.IsNullOrEmpty(needle) || x.label.ToLowerInvariant().Contains(needle))
            .OrderBy(x => x.label)
            .Take(cap)
            .ToList();

        var savedRoutes = await (from s in db.SavedRoutes.AsNoTracking()
                join r in db.Routes.AsNoTracking() on s.RouteId equals r.Id
                where s.UserId == uid.Value
                select new { r.Id, r.Title })
            .ToListAsync(ct);
        var routes = savedRoutes
            .Select(x => new { kind = "route", id = x.Id, label = x.Title })
            .Where(x => string.IsNullOrEmpty(needle) || x.label.ToLowerInvariant().Contains(needle))
            .OrderBy(x => x.label)
            .Take(cap)
            .ToList();

        var now = DateTime.UtcNow;
        var rideQuery = db.Rides.AsNoTracking()
            .Where(r => r.Kind == RideKind.Scheduled && r.ScheduledDate >= now
                && (r.ClubId == clubId
                    || (r.ClubId == null && (r.CreatedByUserId == uid.Value
                        || db.RideParticipants.Any(p => p.RideId == r.Id && p.UserId == uid.Value)))));
        var ridesRaw = await rideQuery
            .OrderBy(r => r.ScheduledDate)
            .Take(cap * 2)
            .Select(r => new { r.Id, r.Name, r.ScheduledDate })
            .ToListAsync(ct);
        var rides = ridesRaw
            .Select(x =>
            {
                var label = $"{x.Name} · {x.ScheduledDate.ToUniversalTime():yyyy-MM-dd}";
                return new { kind = "ride", id = x.Id, label };
            })
            .Where(x => string.IsNullOrEmpty(needle) || x.label.ToLowerInvariant().Contains(needle))
            .Take(cap)
            .ToList();

        return Ok(new { users, routes, rides });
    }

    private async Task<string?> ValidateMentionsAsync(int clubId, int senderId, List<MentionIn> mentions, CancellationToken ct)
    {
        foreach (var m in mentions)
        {
            var kind = (m.Kind ?? "").Trim().ToLowerInvariant();
            switch (kind)
            {
                case "user":
                    if (!await db.ClubMembers.AnyAsync(
                            x => x.ClubId == clubId && x.UserId == m.Id && x.MembershipStatus == ClubMembershipStatus.Active,
                            ct))
                        return $"Invalid user mention: {m.Id}";
                    break;
                case "route":
                    if (!await db.SavedRoutes.AnyAsync(s => s.UserId == senderId && s.RouteId == m.Id, ct))
                        return $"Invalid route mention: {m.Id}";
                    break;
                case "ride":
                    {
                        var ride = await db.Rides.AsNoTracking().FirstOrDefaultAsync(r => r.Id == m.Id, ct);
                        if (ride == null || ride.Kind != RideKind.Scheduled || ride.ScheduledDate < DateTime.UtcNow)
                            return $"Invalid ride mention: {m.Id}";
                        var ok = ride.ClubId == clubId
                            || (ride.ClubId == null && (ride.CreatedByUserId == senderId
                                || await db.RideParticipants.AnyAsync(p => p.RideId == m.Id && p.UserId == senderId, ct)));
                        if (!ok) return $"Invalid ride mention: {m.Id}";
                        break;
                    }
                default:
                    return $"Unknown mention kind: {m.Kind}";
            }
        }

        return null;
    }

    private async Task<object> BuildMessageDtoAsync(ClubChatMessage m, CancellationToken ct)
    {
        var authorName = DisplayName(m.Author);
        var clubNameHint = await db.CyclingClubs.AsNoTracking()
            .Where(c => c.Id == m.ClubId)
            .Select(c => c.Name)
            .FirstOrDefaultAsync(ct) ?? "";
        List<object> mentionObjs = new();
        if (!string.IsNullOrEmpty(m.MentionsJson))
        {
            try
            {
                var raw = JsonSerializer.Deserialize<List<MentionIn>>(m.MentionsJson, JsonOpts);
                if (raw != null)
                {
                    foreach (var x in raw)
                    {
                        var kind = (x.Kind ?? "").ToLowerInvariant();
                        var label = kind switch
                        {
                            "user" => await db.Users.AsNoTracking().Where(u => u.Id == x.Id).Select(u => DisplayName(u)).FirstOrDefaultAsync(ct) ?? $"User {x.Id}",
                            "route" => await db.Routes.AsNoTracking().Where(r => r.Id == x.Id).Select(r => r.Title).FirstOrDefaultAsync(ct) ?? $"Route {x.Id}",
                            "ride" => await db.Rides.AsNoTracking().Where(r => r.Id == x.Id)
                                .Select(r => r.Name + " · " + r.ScheduledDate.ToUniversalTime().ToString("yyyy-MM-dd")).FirstOrDefaultAsync(ct) ?? $"Ride {x.Id}",
                            _ => $"#{x.Id}",
                        };
                        mentionObjs.Add(new { kind, id = x.Id, label });
                    }
                }
            }
            catch
            {
                /* ignore bad json */
            }
        }

        return new
        {
            id = m.Id,
            clubId = m.ClubId,
            clubNameHint = clubNameHint,
            authorUserId = m.AuthorUserId,
            authorDisplayName = authorName,
            authorAvatarUrl = UserPublicFields.RosterAvatarUrl(m.Author),
            body = m.Body,
            mentions = mentionObjs,
            sentAt = m.SentAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
        };
    }
}
