using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;
using Rydo.Api.Hubs;
using Rydo.Api.Services;

namespace Rydo.Api.Controllers;

[ApiController]
[Route("api/rides/{rideId:int}/chat")]
[Authorize]
public class RideChatController(
    RydoDbContext db,
    IHubContext<RideChatHub> hubContext,
    RideChatMessageDtoFactory messageDtoFactory) : ControllerBase
{
    private const int MaxBodyLength = 8000;
    private const int DefaultTake = 40;
    private const int MaxTake = 100;

    private int? CurrentUserId()
    {
        var s = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(s, out var id) ? id : null;
    }

    private async Task<Ride?> RequireParticipantRideAsync(int rideId, int userId, CancellationToken ct)
    {
        var ride = await db.Rides.AsNoTracking().FirstOrDefaultAsync(r => r.Id == rideId, ct);
        if (ride == null || ride.Kind == RideKind.SoloLog)
            return null;
        var isParticipant = await db.RideParticipants.AsNoTracking()
            .AnyAsync(p => p.RideId == rideId && p.UserId == userId, ct);
        return isParticipant ? ride : null;
    }

    [HttpGet("messages")]
    public async Task<IActionResult> GetMessages(
        int rideId,
        [FromQuery] int? beforeMessageId,
        [FromQuery] int? fromMessageId,
        [FromQuery] int? take,
        CancellationToken ct)
    {
        var uid = CurrentUserId();
        if (uid == null) return Unauthorized();

        var ride = await RequireParticipantRideAsync(rideId, uid.Value, ct);
        if (ride == null) return Forbid();

        var n = Math.Clamp(take ?? DefaultTake, 1, MaxTake);
        var dtos = new List<object>();

        if (fromMessageId is int fm)
        {
            var rows = await db.RideChatMessages.AsNoTracking()
                .Include(m => m.Author)
                .Where(m => m.RideId == rideId && m.Id >= fm)
                .OrderBy(m => m.Id)
                .Take(n)
                .ToListAsync(ct);
            foreach (var m in rows)
                dtos.Add(messageDtoFactory.Build(m));
        }
        else
        {
            var q = db.RideChatMessages.AsNoTracking()
                .Include(m => m.Author)
                .Where(m => m.RideId == rideId);
            if (beforeMessageId is int b)
                q = q.Where(m => m.Id < b);
            var rowsDesc = await q.OrderByDescending(m => m.Id).Take(n).ToListAsync(ct);
            rowsDesc.Reverse();
            foreach (var m in rowsDesc)
                dtos.Add(messageDtoFactory.Build(m));
        }

        return Ok(new
        {
            messages = dtos,
            readOnly = !RideEventWindow.ChatWritable(ride),
            closesAt = RideEventWindow.ClosesAt(ride).ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
        });
    }

    public record PostRideChatRequest(string Body);

    [HttpPost("messages")]
    public async Task<IActionResult> PostMessage(int rideId, [FromBody] PostRideChatRequest body, CancellationToken ct)
    {
        var uid = CurrentUserId();
        if (uid == null) return Unauthorized();

        var ride = await db.Rides.FirstOrDefaultAsync(r => r.Id == rideId, ct);
        if (ride == null || ride.Kind == RideKind.SoloLog)
            return NotFound();

        var isParticipant = await db.RideParticipants.AnyAsync(p => p.RideId == rideId && p.UserId == uid.Value, ct);
        if (!isParticipant) return Forbid();

        if (!RideEventWindow.ChatWritable(ride))
            return Problem(statusCode: 403, title: "Ride chat is read-only");

        var text = (body.Body ?? "").Trim();
        if (text.Length == 0) return Problem(statusCode: 400, title: "Message body is required");
        if (text.Length > MaxBodyLength) return Problem(statusCode: 400, title: $"Body exceeds {MaxBodyLength} characters");

        var msg = new RideChatMessage
        {
            RideId = rideId,
            AuthorUserId = uid.Value,
            Body = text,
            SentAt = DateTime.UtcNow,
        };
        db.RideChatMessages.Add(msg);
        await db.SaveChangesAsync(ct);

        await UpsertLastReadAsync(rideId, uid.Value, msg.Id, ct);

        await db.Entry(msg).Reference(m => m.Author).LoadAsync(ct);
        var dto = messageDtoFactory.Build(msg);
        await hubContext.Clients.Group(RideChatHub.RideGroupName(rideId)).SendAsync("ReceiveMessage", dto, ct);
        return Ok(dto);
    }

    public record MarkReadRequest(int? LastReadMessageId, bool? MarkLatest);

    [HttpPost("read")]
    public async Task<IActionResult> MarkRead(int rideId, [FromBody] MarkReadRequest body, CancellationToken ct)
    {
        var uid = CurrentUserId();
        if (uid == null) return Unauthorized();

        var ride = await RequireParticipantRideAsync(rideId, uid.Value, ct);
        if (ride == null) return Forbid();

        int? targetId = body.LastReadMessageId;
        if (body.MarkLatest == true || targetId == null)
        {
            targetId = await db.RideChatMessages.AsNoTracking()
                .Where(m => m.RideId == rideId)
                .OrderByDescending(m => m.Id)
                .Select(m => (int?)m.Id)
                .FirstOrDefaultAsync(ct);
        }

        var row = await db.RideChatReadStates.FirstOrDefaultAsync(x => x.RideId == rideId && x.UserId == uid.Value, ct);
        if (row == null)
        {
            row = new RideChatReadState { RideId = rideId, UserId = uid.Value, LastReadMessageId = targetId };
            db.RideChatReadStates.Add(row);
        }
        else if (targetId != null && (row.LastReadMessageId == null || targetId > row.LastReadMessageId))
        {
            row.LastReadMessageId = targetId;
        }

        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private async Task UpsertLastReadAsync(int rideId, int userId, int messageId, CancellationToken ct)
    {
        var row = await db.RideChatReadStates.FirstOrDefaultAsync(x => x.RideId == rideId && x.UserId == userId, ct);
        if (row == null)
        {
            db.RideChatReadStates.Add(new RideChatReadState
            {
                RideId = rideId,
                UserId = userId,
                LastReadMessageId = messageId,
            });
        }
        else if (row.LastReadMessageId == null || messageId > row.LastReadMessageId.Value)
        {
            row.LastReadMessageId = messageId;
        }

        await db.SaveChangesAsync(ct);
    }
}
