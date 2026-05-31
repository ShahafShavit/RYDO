using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;
using Rydo.Api.Services;

namespace Rydo.Api.Controllers;

[ApiController]
[Route("api/users/me/ride-chat")]
[Authorize]
public class MeRideChatController(RydoDbContext db) : ControllerBase
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

        var rides = await (
            from p in db.RideParticipants.AsNoTracking()
            join r in db.Rides.AsNoTracking() on p.RideId equals r.Id
            join c in db.CyclingClubs.AsNoTracking() on r.ClubId equals (int?)c.Id into cj
            from c in cj.DefaultIfEmpty()
            where p.UserId == uid.Value && r.Kind != RideKind.SoloLog
            select new
            {
                r.Id,
                r.Name,
                r.ScheduledDate,
                r.ClubId,
                ClubName = c != null ? c.Name : null,
                r.Kind,
            })
            .ToListAsync(ct);

        if (rides.Count == 0)
            return Ok(Array.Empty<object>());

        var rideIds = rides.Select(r => r.Id).ToList();

        var readStates = await db.RideChatReadStates.AsNoTracking()
            .Where(x => x.UserId == uid.Value && rideIds.Contains(x.RideId))
            .ToDictionaryAsync(x => x.RideId, x => x.LastReadMessageId, ct);

        var lastMessages = await db.RideChatMessages.AsNoTracking()
            .Where(m => rideIds.Contains(m.RideId))
            .GroupBy(m => m.RideId)
            .Select(g => new
            {
                RideId = g.Key,
                Last = g.OrderByDescending(m => m.Id).Select(m => new { m.Body, m.SentAt }).FirstOrDefault(),
            })
            .ToListAsync(ct);

        var lastByRide = lastMessages.ToDictionary(x => x.RideId, x => x.Last);

        var otherMessages = await db.RideChatMessages.AsNoTracking()
            .Where(m => rideIds.Contains(m.RideId) && m.AuthorUserId != uid.Value)
            .Select(m => new { m.RideId, m.Id })
            .ToListAsync(ct);

        var unreadByRide = new Dictionary<int, int>();
        foreach (var rideId in rideIds)
        {
            readStates.TryGetValue(rideId, out var lastReadId);
            unreadByRide[rideId] = otherMessages.Count(m =>
                m.RideId == rideId && (lastReadId == null || m.Id > lastReadId));
        }

        var result = rides
            .Select(r =>
            {
                lastByRide.TryGetValue(r.Id, out var lastMsg);
                unreadByRide.TryGetValue(r.Id, out var unread);
                var rideEntity = new Ride
                {
                    Id = r.Id,
                    ScheduledDate = r.ScheduledDate,
                    Kind = r.Kind,
                };
                var readOnly = !RideEventWindow.ChatWritable(rideEntity);
                var preview = lastMsg == null
                    ? (string?)null
                    : (lastMsg.Body.Length > 120 ? lastMsg.Body[..120] + "…" : lastMsg.Body);
                var lastAt = lastMsg?.SentAt;

                return new
                {
                    rideId = r.Id,
                    rideName = r.Name,
                    clubId = r.ClubId,
                    clubName = r.ClubName,
                    unreadCount = unread,
                    lastMessagePreview = preview,
                    lastMessageAt = lastAt == null
                        ? (string?)null
                        : lastAt.Value.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                    scheduledDate = r.ScheduledDate.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                    readOnly,
                    sortActivity = lastAt ?? r.ScheduledDate,
                };
            })
            .OrderByDescending(x => x.sortActivity)
            .Select(x => new
            {
                x.rideId,
                x.rideName,
                x.clubId,
                x.clubName,
                x.unreadCount,
                x.lastMessagePreview,
                x.lastMessageAt,
                x.scheduledDate,
                x.readOnly,
            })
            .ToList();

        return Ok(result);
    }
}
