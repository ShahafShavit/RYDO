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
public class FriendsController(RydoDbContext db, UserManager<ApplicationUser> users, IUserHandleService handles) : ControllerBase
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
        handle = u.Handle,
        fullName = DisplayName(u),
        avatarUrl = UserPublicFields.RosterAvatarUrl(u),
    };

    [HttpPost("{handle}/friend-request")]
    public async Task<IActionResult> SendFriendRequest(string handle, CancellationToken ct)
    {
        if (CurrentUserId() is not { } viewerId)
            return Unauthorized();

        var target = await handles.ResolveUserAsync(handle, ct);
        if (target == null)
            return NotFound();

        var userId = target.Id;
        if (viewerId == userId)
            return Problem(statusCode: 400, detail: "Cannot send a friend request to yourself.");

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

    [HttpDelete("me/friend-requests/outgoing/{targetHandle}")]
    public async Task<IActionResult> CancelOutgoingFriendRequest(string targetHandle, CancellationToken ct)
    {
        if (CurrentUserId() is not { } viewerId)
            return Unauthorized();

        var targetUserId = await handles.ResolveUserIdAsync(targetHandle, ct);
        if (targetUserId == null)
            return NotFound();

        var fr = await db.FriendRequests
            .FirstOrDefaultAsync(f => f.FromUserId == viewerId && f.ToUserId == targetUserId && f.Status == FriendRequestStatus.Pending, ct);
        if (fr == null)
            return NotFound();

        var now = DateTime.UtcNow;
        fr.Status = FriendRequestStatus.Cancelled;
        fr.RespondedAt = now;

        await db.InboxItems
            .Where(i => i.FriendRequestId == fr.Id && i.RecipientUserId == targetUserId.Value)
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

    [HttpGet("{handle}/friends")]
    public async Task<IActionResult> ListFriends(string handle, CancellationToken ct)
    {
        if (CurrentUserId() is not { } viewerId)
            return Unauthorized();

        var subject = await handles.ResolveUserAsync(handle, ct);
        if (subject == null)
            return NotFound();

        var userId = subject.Id;

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

    [HttpGet("{handle}/relationship")]
    public async Task<IActionResult> GetRelationship(string handle, CancellationToken ct)
    {
        if (CurrentUserId() is not { } viewerId)
            return Unauthorized();

        var subject = await handles.ResolveUserAsync(handle, ct);
        if (subject == null)
            return NotFound();

        var userId = subject.Id;
        if (viewerId == userId)
            return Ok(new { status = "self" });

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

    private static string[] InboxKindsForTab(string? tab) => tab?.ToLowerInvariant() switch
    {
        "friends" => [InboxItemKind.FriendRequest],
        "rides" => [InboxItemKind.RideInvite, InboxItemKind.ClubRideAnnounced],
        "club" => [InboxItemKind.ClubJoinRequest],
        "activity" => [InboxItemKind.QuestComplete, InboxItemKind.LevelUp],
        _ => [],
    };

    private static object RideInboxSummary(Ride ride) => new
    {
        id = ride.Id,
        name = ride.Name,
        scheduledDate = ride.ScheduledDate.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
        routeTitle = ride.Route?.Title ?? "",
        clubId = ride.ClubId,
    };

    [HttpGet("me/inbox/summary")]
    public async Task<IActionResult> InboxSummary(CancellationToken ct)
    {
        if (CurrentUserId() is not { } viewerId)
            return Unauthorized();

        var baseQ = db.InboxItems.AsNoTracking()
            .Where(i => i.RecipientUserId == viewerId && i.ResolvedAt == null && i.ReadAt == null);

        var unreadCount = await baseQ.CountAsync(ct);
        var friendUnread = await baseQ.CountAsync(i => i.Kind == InboxItemKind.FriendRequest, ct);
        var rideUnread = await baseQ.CountAsync(i =>
            i.Kind == InboxItemKind.RideInvite || i.Kind == InboxItemKind.ClubRideAnnounced, ct);
        var clubUnread = await baseQ.CountAsync(i => i.Kind == InboxItemKind.ClubJoinRequest, ct);
        var activityUnread = await baseQ.CountAsync(i =>
            i.Kind == InboxItemKind.QuestComplete || i.Kind == InboxItemKind.LevelUp, ct);

        return Ok(new { unreadCount, friendUnread, rideUnread, clubUnread, activityUnread });
    }

    [HttpGet("me/inbox")]
    public async Task<IActionResult> Inbox(
        [FromQuery] string? tab = null,
        [FromQuery] bool unreadOnly = false,
        [FromQuery] int take = 50,
        CancellationToken ct = default)
    {
        if (CurrentUserId() is not { } viewerId)
            return Unauthorized();

        take = Math.Clamp(take, 1, 100);

        var q = db.InboxItems.AsNoTracking()
            .Include(i => i.FriendRequest)!.ThenInclude(f => f!.FromUser)
            .Include(i => i.RideInvite)!.ThenInclude(ri => ri!.FromUser)
            .Include(i => i.RideInvite)!.ThenInclude(ri => ri!.Ride)!.ThenInclude(r => r!.Route)
            .Include(i => i.Ride)!.ThenInclude(r => r!.Route)
            .Include(i => i.Ride)!.ThenInclude(r => r!.CreatedBy)
            .Include(i => i.Club)
            .Include(i => i.ClubJoinRequester)
            .Include(i => i.ChallengeInstance)
            .Where(i => i.RecipientUserId == viewerId)
            .OrderByDescending(i => i.CreatedAt)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(tab))
        {
            var kinds = InboxKindsForTab(tab);
            if (kinds.Length == 0)
                return Problem(statusCode: 400, detail: "tab must be friends, rides, club, or activity.");
            q = q.Where(i => kinds.Contains(i.Kind));
        }

        if (unreadOnly)
            q = q.Where(i => i.ReadAt == null && i.ResolvedAt == null);

        var rows = await q.Take(take).ToListAsync(ct);

        var items = new List<object>();
        foreach (var i in rows)
        {
            var createdAt = i.CreatedAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ");
            var readAt = i.ReadAt?.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ");
            var resolvedAt = i.ResolvedAt?.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ");

            if (i.Kind == InboxItemKind.FriendRequest && i.FriendRequest?.FromUser != null)
            {
                var fr = i.FriendRequest;
                items.Add(new
                {
                    id = i.Id,
                    kind = i.Kind,
                    createdAt,
                    readAt,
                    resolvedAt,
                    friendRequest = new
                    {
                        id = fr.Id,
                        status = fr.Status.ToString().ToLowerInvariant(),
                        fromUser = UserSummary(fr.FromUser),
                    },
                    clubJoinRequest = (object?)null,
                    rideInvite = (object?)null,
                    clubRideAnnounced = (object?)null,
                });
            }
            else if (i.Kind == InboxItemKind.ClubJoinRequest && i.Club != null && i.ClubJoinRequester != null)
            {
                items.Add(new
                {
                    id = i.Id,
                    kind = i.Kind,
                    createdAt,
                    readAt,
                    resolvedAt,
                    friendRequest = (object?)null,
                    clubJoinRequest = new
                    {
                        club = new { id = i.Club.Id, name = i.Club.Name },
                        requester = UserSummary(i.ClubJoinRequester),
                    },
                    rideInvite = (object?)null,
                    clubRideAnnounced = (object?)null,
                });
            }
            else if (i.Kind == InboxItemKind.RideInvite && i.RideInvite?.FromUser != null && i.RideInvite.Ride != null)
            {
                var ri = i.RideInvite;
                items.Add(new
                {
                    id = i.Id,
                    kind = i.Kind,
                    createdAt,
                    readAt,
                    resolvedAt,
                    friendRequest = (object?)null,
                    clubJoinRequest = (object?)null,
                    rideInvite = new
                    {
                        id = ri.Id,
                        status = ri.Status.ToString().ToLowerInvariant(),
                        fromUser = UserSummary(ri.FromUser),
                        ride = RideInboxSummary(ri.Ride),
                    },
                    clubRideAnnounced = (object?)null,
                });
            }
            else if (i.Kind == InboxItemKind.ClubRideAnnounced && i.Ride != null && i.Club != null)
            {
                items.Add(new
                {
                    id = i.Id,
                    kind = i.Kind,
                    createdAt,
                    readAt,
                    resolvedAt,
                    friendRequest = (object?)null,
                    clubJoinRequest = (object?)null,
                    rideInvite = (object?)null,
                    clubRideAnnounced = new
                    {
                        ride = RideInboxSummary(i.Ride),
                        club = new { id = i.Club.Id, name = i.Club.Name },
                        createdBy = i.Ride.CreatedBy != null ? UserSummary(i.Ride.CreatedBy) : null,
                    },
                    gamification = (object?)null,
                });
            }
            else if (i.Kind == InboxItemKind.QuestComplete)
            {
                items.Add(new
                {
                    id = i.Id,
                    kind = i.Kind,
                    createdAt,
                    readAt,
                    resolvedAt,
                    friendRequest = (object?)null,
                    clubJoinRequest = (object?)null,
                    rideInvite = (object?)null,
                    clubRideAnnounced = (object?)null,
                    gamification = new
                    {
                        type = "quest_complete",
                        challengeInstanceId = i.ChallengeInstanceId,
                        title = i.ChallengeInstance?.Title ?? "Quest complete",
                        href = "/challenges#quests",
                    },
                });
            }
            else if (i.Kind == InboxItemKind.LevelUp)
            {
                items.Add(new
                {
                    id = i.Id,
                    kind = i.Kind,
                    createdAt,
                    readAt,
                    resolvedAt,
                    friendRequest = (object?)null,
                    clubJoinRequest = (object?)null,
                    rideInvite = (object?)null,
                    clubRideAnnounced = (object?)null,
                    gamification = new
                    {
                        type = "level_up",
                        level = i.GamificationLevel,
                        href = "/challenges",
                    },
                });
            }
            else
            {
                items.Add(new
                {
                    id = i.Id,
                    kind = i.Kind,
                    createdAt,
                    readAt,
                    resolvedAt,
                    friendRequest = (object?)null,
                    clubJoinRequest = (object?)null,
                    rideInvite = (object?)null,
                    clubRideAnnounced = (object?)null,
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
