using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;
using Rydo.Api.Services;

namespace Rydo.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class FriendsController(RydoDbContext db, UserManager<ApplicationUser> users) : ControllerBase
{
    private int? CurrentUserId()
    {
        var s = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(s, out var id) ? id : null;
    }

    private static string DisplayName(ApplicationUser? u) =>
        u == null ? "" : string.Join(" ", new[] { u.FirstName, u.LastName }.Where(x => !string.IsNullOrWhiteSpace(x))).Trim();

    private static (int Lower, int Higher) CanonicalPair(int a, int b) => a < b ? (a, b) : (b, a);

    private object UserSummary(ApplicationUser u) => new
    {
        id = u.Id,
        fullName = DisplayName(u),
        avatarUrl = UserPublicFields.RosterAvatarUrl(u),
    };

    [HttpPost("{userId:int}/friend-request")]
    public async Task<IActionResult> SendFriendRequest(int userId, CancellationToken ct)
    {
        if (CurrentUserId() is not { } viewerId)
            return Unauthorized();
        if (viewerId == userId)
            return Problem(statusCode: 400, detail: "Cannot send a friend request to yourself.");

        var target = await users.FindByIdAsync(userId.ToString());
        if (target == null)
            return NotFound();

        var (lo, hi) = CanonicalPair(viewerId, userId);
        if (await db.Friendships.AsNoTracking().AnyAsync(f => f.UserIdLower == lo && f.UserIdHigher == hi, ct))
            return Problem(statusCode: 400, detail: "You are already friends with this user.");

        var incoming = await db.FriendRequests
            .FirstOrDefaultAsync(f => f.FromUserId == userId && f.ToUserId == viewerId && f.Status == FriendRequestStatus.Pending, ct);
        if (incoming != null)
            return Problem(statusCode: 409, detail: "This user already sent you a request. Accept it from your inbox.");

        var outgoing = await db.FriendRequests
            .FirstOrDefaultAsync(f => f.FromUserId == viewerId && f.ToUserId == userId, ct);

        if (outgoing is { Status: FriendRequestStatus.Pending })
            return Problem(statusCode: 400, detail: "A friend request is already pending.");

        if (outgoing != null)
        {
            if (outgoing.Status is FriendRequestStatus.Accepted)
                return Problem(statusCode: 400, detail: "You are already friends with this user.");

            outgoing.Status = FriendRequestStatus.Pending;
            outgoing.CreatedAt = DateTime.UtcNow;
            outgoing.RespondedAt = null;
            db.InboxItems.Add(new InboxItem
            {
                RecipientUserId = userId,
                Kind = InboxItemKind.FriendRequest,
                FriendRequestId = outgoing.Id,
                CreatedAt = DateTime.UtcNow,
            });
            await db.SaveChangesAsync(ct);
            return Ok(new { requestId = outgoing.Id, status = "pending" });
        }

        var fr = new FriendRequest
        {
            FromUserId = viewerId,
            ToUserId = userId,
            Status = FriendRequestStatus.Pending,
            CreatedAt = DateTime.UtcNow,
        };
        db.FriendRequests.Add(fr);
        await db.SaveChangesAsync(ct);

        db.InboxItems.Add(new InboxItem
        {
            RecipientUserId = userId,
            Kind = InboxItemKind.FriendRequest,
            FriendRequestId = fr.Id,
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync(ct);

        return Ok(new { requestId = fr.Id, status = "pending" });
    }

    [HttpDelete("me/friend-requests/outgoing/{targetUserId:int}")]
    public async Task<IActionResult> CancelOutgoingFriendRequest(int targetUserId, CancellationToken ct)
    {
        if (CurrentUserId() is not { } viewerId)
            return Unauthorized();

        var fr = await db.FriendRequests
            .FirstOrDefaultAsync(f => f.FromUserId == viewerId && f.ToUserId == targetUserId && f.Status == FriendRequestStatus.Pending, ct);
        if (fr == null)
            return NotFound();

        var now = DateTime.UtcNow;
        fr.Status = FriendRequestStatus.Cancelled;
        fr.RespondedAt = now;

        await db.InboxItems
            .Where(i => i.FriendRequestId == fr.Id && i.RecipientUserId == targetUserId)
            .ExecuteUpdateAsync(s => s.SetProperty(i => i.ResolvedAt, now), ct);

        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("me/friend-requests/{requestId:int}/accept")]
    public async Task<IActionResult> AcceptFriendRequest(int requestId, CancellationToken ct)
    {
        if (CurrentUserId() is not { } viewerId)
            return Unauthorized();

        var fr = await db.FriendRequests.FirstOrDefaultAsync(f => f.Id == requestId, ct);
        if (fr == null)
            return NotFound();
        if (fr.ToUserId != viewerId)
            return Problem(statusCode: 403, detail: "Only the recipient can accept this request.");
        if (fr.Status != FriendRequestStatus.Pending)
            return Problem(statusCode: 400, detail: "This request is no longer pending.");

        var (lo, hi) = CanonicalPair(fr.FromUserId, fr.ToUserId);
        if (await db.Friendships.AsNoTracking().AnyAsync(f => f.UserIdLower == lo && f.UserIdHigher == hi, ct))
            return Problem(statusCode: 400, detail: "You are already friends.");

        var now = DateTime.UtcNow;
        fr.Status = FriendRequestStatus.Accepted;
        fr.RespondedAt = now;

        db.Friendships.Add(new Friendship
        {
            UserIdLower = lo,
            UserIdHigher = hi,
            CreatedAt = now,
        });

        await db.InboxItems
            .Where(i => i.FriendRequestId == requestId && i.RecipientUserId == viewerId)
            .ExecuteUpdateAsync(s => s.SetProperty(i => i.ResolvedAt, now), ct);

        await db.SaveChangesAsync(ct);

        return Ok(new { status = "friends" });
    }

    [HttpPost("me/friend-requests/{requestId:int}/decline")]
    public async Task<IActionResult> DeclineFriendRequest(int requestId, CancellationToken ct)
    {
        if (CurrentUserId() is not { } viewerId)
            return Unauthorized();

        var fr = await db.FriendRequests.FirstOrDefaultAsync(f => f.Id == requestId, ct);
        if (fr == null)
            return NotFound();
        if (fr.ToUserId != viewerId)
            return Problem(statusCode: 403, detail: "Only the recipient can decline this request.");
        if (fr.Status != FriendRequestStatus.Pending)
            return Problem(statusCode: 400, detail: "This request is no longer pending.");

        var now = DateTime.UtcNow;
        fr.Status = FriendRequestStatus.Declined;
        fr.RespondedAt = now;

        await db.InboxItems
            .Where(i => i.FriendRequestId == requestId && i.RecipientUserId == viewerId)
            .ExecuteUpdateAsync(s => s.SetProperty(i => i.ResolvedAt, now), ct);

        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpGet("{userId:int}/friends")]
    public async Task<IActionResult> ListFriends(int userId, CancellationToken ct)
    {
        if (CurrentUserId() is not { } viewerId)
            return Unauthorized();

        var subjectPref = await db.UserPreferences.AsNoTracking()
            .FirstOrDefaultAsync(x => x.UserId == userId, ct);
        var friendsListVisibleOnProfile = subjectPref?.PublicFriendsListOnProfile ?? true;

        if (viewerId != userId)
        {
            if (!friendsListVisibleOnProfile)
                return Problem(statusCode: 403, detail: "This member chose not to show their friends list on their profile.");

            var (lo, hi) = CanonicalPair(viewerId, userId);
            var canSee = await db.Friendships.AsNoTracking()
                .AnyAsync(f => f.UserIdLower == lo && f.UserIdHigher == hi, ct);
            if (!canSee)
                return Problem(statusCode: 403, detail: "You can only view another member's friends list when you are friends.");
        }

        var friendIds = await db.Friendships.AsNoTracking()
            .Where(f => f.UserIdLower == userId || f.UserIdHigher == userId)
            .Select(f => f.UserIdLower == userId ? f.UserIdHigher : f.UserIdLower)
            .ToListAsync(ct);

        if (friendIds.Count == 0)
            return Ok(new { items = Array.Empty<object>() });

        List<int> idsToLoad;
        if (viewerId == userId)
        {
            idsToLoad = friendIds;
        }
        else
        {
            var prefs = await db.UserPreferences.AsNoTracking()
                .Where(p => friendIds.Contains(p.UserId))
                .ToDictionaryAsync(p => p.UserId, ct);
            idsToLoad = friendIds
                .Where(fid => !prefs.TryGetValue(fid, out var pr) || pr.PublicInOthersFriendsLists)
                .ToList();
        }

        if (idsToLoad.Count == 0)
            return Ok(new { items = Array.Empty<object>() });

        var friendUsers = await users.Users.AsNoTracking()
            .Where(u => idsToLoad.Contains(u.Id))
            .OrderBy(u => u.LastName)
            .ThenBy(u => u.FirstName)
            .ToListAsync(ct);

        var items = friendUsers.Select(u => UserSummary(u)).ToList();
        return Ok(new { items });
    }

    [HttpGet("{userId:int}/relationship")]
    public async Task<IActionResult> GetRelationship(int userId, CancellationToken ct)
    {
        if (CurrentUserId() is not { } viewerId)
            return Unauthorized();
        if (viewerId == userId)
            return Ok(new { status = "self" });

        if (!await users.Users.AsNoTracking().AnyAsync(u => u.Id == userId, ct))
            return NotFound();

        var (lo, hi) = CanonicalPair(viewerId, userId);
        if (await db.Friendships.AsNoTracking().AnyAsync(f => f.UserIdLower == lo && f.UserIdHigher == hi, ct))
            return Ok(new { status = "friends" });

        var outgoing = await db.FriendRequests.AsNoTracking()
            .FirstOrDefaultAsync(f => f.FromUserId == viewerId && f.ToUserId == userId && f.Status == FriendRequestStatus.Pending, ct);
        if (outgoing != null)
            return Ok(new { status = "outgoing_pending", requestId = outgoing.Id });

        var incoming = await db.FriendRequests.AsNoTracking()
            .FirstOrDefaultAsync(f => f.FromUserId == userId && f.ToUserId == viewerId && f.Status == FriendRequestStatus.Pending, ct);
        if (incoming != null)
            return Ok(new { status = "incoming_pending", requestId = incoming.Id });

        return Ok(new { status = "none" });
    }

    [HttpGet("me/inbox/summary")]
    public async Task<IActionResult> InboxSummary(CancellationToken ct)
    {
        if (CurrentUserId() is not { } viewerId)
            return Unauthorized();

        var unreadCount = await db.InboxItems.AsNoTracking()
            .CountAsync(i => i.RecipientUserId == viewerId && i.ResolvedAt == null && i.ReadAt == null, ct);

        return Ok(new { unreadCount });
    }

    [HttpGet("me/inbox")]
    public async Task<IActionResult> Inbox([FromQuery] bool unreadOnly = false, [FromQuery] int take = 50, CancellationToken ct = default)
    {
        if (CurrentUserId() is not { } viewerId)
            return Unauthorized();

        take = Math.Clamp(take, 1, 100);

        var q = db.InboxItems.AsNoTracking()
            .Include(i => i.FriendRequest)!.ThenInclude(f => f!.FromUser)
            .Include(i => i.Club)
            .Include(i => i.ClubJoinRequester)
            .Where(i => i.RecipientUserId == viewerId)
            .OrderByDescending(i => i.CreatedAt)
            .AsQueryable();

        if (unreadOnly)
            q = q.Where(i => i.ReadAt == null && i.ResolvedAt == null);

        var rows = await q.Take(take).ToListAsync(ct);

        var items = new List<object>();
        foreach (var i in rows)
        {
            if (i.Kind == InboxItemKind.FriendRequest && i.FriendRequest?.FromUser != null)
            {
                var fr = i.FriendRequest;
                items.Add(new
                {
                    id = i.Id,
                    kind = i.Kind,
                    createdAt = i.CreatedAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                    readAt = i.ReadAt?.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                    resolvedAt = i.ResolvedAt?.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                    friendRequest = new
                    {
                        id = fr.Id,
                        status = fr.Status.ToString().ToLowerInvariant(),
                        fromUser = UserSummary(fr.FromUser),
                    },
                    clubJoinRequest = (object?)null,
                });
            }
            else if (i.Kind == InboxItemKind.ClubJoinRequest && i.Club != null && i.ClubJoinRequester != null)
            {
                items.Add(new
                {
                    id = i.Id,
                    kind = i.Kind,
                    createdAt = i.CreatedAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                    readAt = i.ReadAt?.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                    resolvedAt = i.ResolvedAt?.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                    friendRequest = (object?)null,
                    clubJoinRequest = new
                    {
                        club = new { id = i.Club.Id, name = i.Club.Name },
                        requester = UserSummary(i.ClubJoinRequester),
                    },
                });
            }
            else
            {
                items.Add(new
                {
                    id = i.Id,
                    kind = i.Kind,
                    createdAt = i.CreatedAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                    readAt = i.ReadAt?.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                    resolvedAt = i.ResolvedAt?.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                    friendRequest = (object?)null,
                    clubJoinRequest = (object?)null,
                });
            }
        }

        return Ok(new { items });
    }

    [HttpPost("me/inbox/{inboxItemId:int}/read")]
    public async Task<IActionResult> MarkInboxRead(int inboxItemId, CancellationToken ct)
    {
        if (CurrentUserId() is not { } viewerId)
            return Unauthorized();

        var exists = await db.InboxItems.AsNoTracking()
            .AnyAsync(i => i.Id == inboxItemId && i.RecipientUserId == viewerId, ct);
        if (!exists)
            return NotFound();

        var now = DateTime.UtcNow;
        await db.InboxItems
            .Where(i => i.Id == inboxItemId && i.RecipientUserId == viewerId && i.ReadAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(i => i.ReadAt, now), ct);

        return NoContent();
    }
}
