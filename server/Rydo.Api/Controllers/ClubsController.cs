using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;
using Rydo.Api.Services;

namespace Rydo.Api.Controllers;

[ApiController]
[Route("api/clubs")]
public class ClubsController(RydoDbContext db) : ControllerBase
{
    private int? CurrentUserId()
    {
        var s = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(s, out var id) ? id : null;
    }

    private static string DisplayName(ApplicationUser? u) =>
        u == null ? "" : string.Join(" ", new[] { u.FirstName, u.LastName }.Where(x => !string.IsNullOrWhiteSpace(x))).Trim();

    private static object MemberDto(ClubMember m) => new
    {
        userId = m.UserId,
        displayName = DisplayName(m.User),
        avatarUrl = UserPublicFields.RosterAvatarUrl(m.User),
        email = m.User?.Email ?? "",
        role = m.Role == ClubMemberRole.Admin ? "admin" : "member",
        membershipStatus = m.MembershipStatus == ClubMembershipStatus.Active ? "active" : "pending",
        requestedAt = m.RequestedAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
        activatedAt = m.ActivatedAt.HasValue
            ? m.ActivatedAt.Value.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            : null,
    };

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var uid = CurrentUserId();
        if (uid == null)
        {
            var publicOnly = await db.CyclingClubs.AsNoTracking()
                .Where(c => c.Visibility == ClubVisibility.Public)
                .OrderBy(c => c.Name)
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.Description,
                    c.Region,
                    visibility = "public",
                    membershipPending = false,
                    myRole = (string?)null,
                    c.CreatedAt,
                })
                .ToListAsync(ct);
            return Ok(publicOnly);
        }

        var memberRows = await db.ClubMembers.AsNoTracking()
            .Where(m => m.UserId == uid.Value)
            .Select(m => new { m.ClubId, m.MembershipStatus, m.Role })
            .ToListAsync(ct);
        var pendingSet = memberRows.Where(m => m.MembershipStatus == ClubMembershipStatus.Pending).Select(m => m.ClubId).ToHashSet();
        var memberClubIds = memberRows.Select(m => m.ClubId).ToHashSet();

        string? MyRole(int clubId)
        {
            var row = memberRows.FirstOrDefault(m => m.ClubId == clubId);
            if (row == null) return null;
            if (row.MembershipStatus == ClubMembershipStatus.Pending) return "pending";
            return row.Role == ClubMemberRole.Admin ? "admin" : "member";
        }

        var list = await db.CyclingClubs.AsNoTracking()
            .Where(c =>
                c.Visibility == ClubVisibility.Public
                || (c.Visibility == ClubVisibility.Private && memberClubIds.Contains(c.Id)))
            .OrderBy(c => c.Name)
            .Select(c => new
            {
                c.Id,
                c.Name,
                c.Description,
                c.Region,
                visibility = c.Visibility == ClubVisibility.Public ? "public" : "private",
                c.CreatedAt,
            })
            .ToListAsync(ct);

        var result = list.Select(c => new
        {
            c.Id,
            c.Name,
            c.Description,
            c.Region,
            c.visibility,
            membershipPending = pendingSet.Contains(c.Id),
            myRole = MyRole(c.Id),
            c.CreatedAt,
        }).ToList();

        return Ok(result);
    }

    public record CreateClubBody(string Name, string Description, string? Region, ClubVisibility Visibility);

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create([FromBody] CreateClubBody body, CancellationToken ct)
    {
        var uid = CurrentUserId() ?? 0;
        if (uid == 0) return Unauthorized();

        var club = new CyclingClub
        {
            Name = body.Name.Trim(),
            Description = body.Description?.Trim() ?? "",
            Region = string.IsNullOrWhiteSpace(body.Region) ? null : body.Region.Trim(),
            Visibility = body.Visibility,
            CreatedByUserId = uid,
            CreatedAt = DateTime.UtcNow,
        };
        db.CyclingClubs.Add(club);
        await db.SaveChangesAsync(ct);

        db.ClubMembers.Add(new ClubMember
        {
            ClubId = club.Id,
            UserId = uid,
            Role = ClubMemberRole.Admin,
            MembershipStatus = ClubMembershipStatus.Active,
            RequestedAt = DateTime.UtcNow,
            ActivatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync(ct);

        return Ok(new
        {
            id = club.Id,
            name = club.Name,
            description = club.Description,
            region = club.Region,
            visibility = club.Visibility == ClubVisibility.Public ? "public" : "private",
            createdAt = club.CreatedAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
        });
    }

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> Get(int id, CancellationToken ct)
    {
        var club = await db.CyclingClubs.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id, ct);
        if (club == null) return NotFound();

        var uid = CurrentUserId();
        string currentUserMembership = "none";
        if (uid != null)
        {
            var mem = await db.ClubMembers.AsNoTracking()
                .FirstOrDefaultAsync(m => m.ClubId == id && m.UserId == uid.Value, ct);
            if (mem != null)
            {
                if (mem.MembershipStatus == ClubMembershipStatus.Pending)
                    currentUserMembership = "pending";
                else if (mem.Role == ClubMemberRole.Admin)
                    currentUserMembership = "admin";
                else
                    currentUserMembership = "member";
            }
        }

        var memberCount = await db.ClubMembers.CountAsync(
            m => m.ClubId == id && m.MembershipStatus == ClubMembershipStatus.Active, ct);

        var isActiveMember = uid != null && await db.ClubMembers.AnyAsync(
            m => m.ClubId == id && m.UserId == uid!.Value && m.MembershipStatus == ClubMembershipStatus.Active,
            ct);

        string? description = club.Description;
        string? region = club.Region;
        int? memberCountPublic = memberCount;
        if (club.Visibility == ClubVisibility.Private && !isActiveMember)
        {
            description = null;
            region = null;
            memberCountPublic = null;
        }

        return Ok(new
        {
            id = club.Id,
            name = club.Name,
            description,
            region,
            visibility = club.Visibility == ClubVisibility.Public ? "public" : "private",
            createdAt = club.CreatedAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
            memberCount = memberCountPublic,
            currentUserMembership,
        });
    }

    [HttpGet("{id:int}/members")]
    [Authorize]
    public async Task<IActionResult> Members(int id, CancellationToken ct)
    {
        var uid = CurrentUserId() ?? 0;
        var my = await db.ClubMembers.AsNoTracking()
            .FirstOrDefaultAsync(m => m.ClubId == id && m.UserId == uid, ct);
        if (my == null || my.MembershipStatus != ClubMembershipStatus.Active) return Forbid();

        var isAdmin = my.Role == ClubMemberRole.Admin;

        var q = db.ClubMembers.AsNoTracking()
            .Include(m => m.User)
            .Where(m => m.ClubId == id);

        if (isAdmin)
            q = q.Where(m =>
                m.MembershipStatus == ClubMembershipStatus.Active
                || m.MembershipStatus == ClubMembershipStatus.Pending);
        else
            q = q.Where(m => m.MembershipStatus == ClubMembershipStatus.Active);

        // Materialize first, then sort in memory. Ordering this query in SQL (Include + ThenBy on
        // navigation properties) can produce incorrect joins and omit rows (e.g. pending members).
        var list = await q.ToListAsync(ct);

        var sorted = list
            .OrderBy(m =>
                m.MembershipStatus == ClubMembershipStatus.Pending
                    ? 2
                    : m.Role == ClubMemberRole.Admin
                        ? 0
                        : 1)
            .ThenBy(m => m.User?.LastName ?? "", StringComparer.Ordinal)
            .ThenBy(m => m.User?.FirstName ?? "", StringComparer.Ordinal)
            .ToList();

        return Ok(sorted.Select(MemberDto));
    }

    [HttpPost("{id:int}/join")]
    [Authorize]
    public async Task<IActionResult> Join(int id, CancellationToken ct)
    {
        var uid = CurrentUserId() ?? 0;
        var club = await db.CyclingClubs.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (club == null) return NotFound();

        var existing = await db.ClubMembers.FirstOrDefaultAsync(m => m.ClubId == id && m.UserId == uid, ct);
        if (existing != null)
        {
            if (existing.MembershipStatus == ClubMembershipStatus.Active)
                return Ok(new { status = "already_member" });
            return Ok(new { status = "pending" });
        }

        if (club.Visibility == ClubVisibility.Public)
        {
            db.ClubMembers.Add(new ClubMember
            {
                ClubId = id,
                UserId = uid,
                Role = ClubMemberRole.Member,
                MembershipStatus = ClubMembershipStatus.Active,
                RequestedAt = DateTime.UtcNow,
                ActivatedAt = DateTime.UtcNow,
            });
        }
        else
        {
            db.ClubMembers.Add(new ClubMember
            {
                ClubId = id,
                UserId = uid,
                Role = ClubMemberRole.Member,
                MembershipStatus = ClubMembershipStatus.Pending,
                RequestedAt = DateTime.UtcNow,
            });
        }

        await db.SaveChangesAsync(ct);
        return Ok(new { status = club.Visibility == ClubVisibility.Public ? "active" : "pending" });
    }

    [HttpPost("{id:int}/leave")]
    [Authorize]
    public async Task<IActionResult> Leave(int id, CancellationToken ct)
    {
        var uid = CurrentUserId() ?? 0;
        var m = await db.ClubMembers.FirstOrDefaultAsync(x => x.ClubId == id && x.UserId == uid, ct);
        if (m == null) return NotFound();

        if (m.Role == ClubMemberRole.Admin && m.MembershipStatus == ClubMembershipStatus.Active)
        {
            var adminCount = await db.ClubMembers.CountAsync(
                x => x.ClubId == id && x.Role == ClubMemberRole.Admin && x.MembershipStatus == ClubMembershipStatus.Active, ct);
            if (adminCount <= 1)
                return Problem(statusCode: 400, title: "Cannot leave", detail: "Assign another admin before leaving.");
        }

        db.ClubMembers.Remove(m);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpGet("{id:int}/join-requests")]
    [Authorize]
    public async Task<IActionResult> JoinRequests(int id, CancellationToken ct)
    {
        var uid = CurrentUserId() ?? 0;
        var isAdmin = await db.ClubMembers.AnyAsync(
            m => m.ClubId == id && m.UserId == uid && m.Role == ClubMemberRole.Admin && m.MembershipStatus == ClubMembershipStatus.Active, ct);
        if (!isAdmin) return Forbid();

        var list = await db.ClubMembers.AsNoTracking()
            .Include(x => x.User)
            .Where(x => x.ClubId == id && x.MembershipStatus == ClubMembershipStatus.Pending)
            .ToListAsync(ct);

        return Ok(list.Select(MemberDto));
    }

    [HttpPost("{id:int}/join-requests/{userId:int}/approve")]
    [Authorize]
    public async Task<IActionResult> ApproveJoin(int id, int userId, CancellationToken ct)
    {
        var uid = CurrentUserId() ?? 0;
        var isAdmin = await db.ClubMembers.AnyAsync(
            m => m.ClubId == id && m.UserId == uid && m.Role == ClubMemberRole.Admin && m.MembershipStatus == ClubMembershipStatus.Active, ct);
        if (!isAdmin) return Forbid();

        var m = await db.ClubMembers.FirstOrDefaultAsync(x => x.ClubId == id && x.UserId == userId, ct);
        if (m == null || m.MembershipStatus != ClubMembershipStatus.Pending) return NotFound();

        m.MembershipStatus = ClubMembershipStatus.Active;
        m.ActivatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("{id:int}/join-requests/{userId:int}/reject")]
    [Authorize]
    public async Task<IActionResult> RejectJoin(int id, int userId, CancellationToken ct)
    {
        var uid = CurrentUserId() ?? 0;
        var isAdmin = await db.ClubMembers.AnyAsync(
            m => m.ClubId == id && m.UserId == uid && m.Role == ClubMemberRole.Admin && m.MembershipStatus == ClubMembershipStatus.Active, ct);
        if (!isAdmin) return Forbid();

        var m = await db.ClubMembers.FirstOrDefaultAsync(x => x.ClubId == id && x.UserId == userId, ct);
        if (m == null || m.MembershipStatus != ClubMembershipStatus.Pending) return NotFound();

        db.ClubMembers.Remove(m);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("{id:int}/invites")]
    [Authorize]
    public async Task<IActionResult> CreateInvite(int id, CancellationToken ct)
    {
        var uid = CurrentUserId() ?? 0;
        var club = await db.CyclingClubs.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (club == null) return NotFound();

        var isAdmin = await db.ClubMembers.AnyAsync(
            m => m.ClubId == id && m.UserId == uid && m.Role == ClubMemberRole.Admin && m.MembershipStatus == ClubMembershipStatus.Active, ct);
        if (!isAdmin) return Forbid();

        var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(24)).ToLowerInvariant();
        var inv = new ClubInvite
        {
            ClubId = id,
            Token = token,
            CreatedByUserId = uid,
            CreatedAt = DateTime.UtcNow,
            MaxUses = 1,
            UsedCount = 0,
        };
        db.ClubInvites.Add(inv);
        await db.SaveChangesAsync(ct);

        return Ok(new { inviteCode = token, clubId = id });
    }

    public record RedeemInviteBody(string Token);

    [HttpPost("invites/redeem")]
    [Authorize]
    public async Task<IActionResult> RedeemInvite([FromBody] RedeemInviteBody body, CancellationToken ct)
    {
        var uid = CurrentUserId() ?? 0;
        var token = (body.Token ?? "").Trim();
        if (string.IsNullOrEmpty(token)) return BadRequest();

        var inv = await db.ClubInvites.Include(i => i.Club)
            .FirstOrDefaultAsync(i => i.Token == token, ct);
        if (inv == null || inv.RevokedAt != null) return NotFound();
        if (inv.ExpiresAt.HasValue && inv.ExpiresAt.Value < DateTime.UtcNow) return Problem(statusCode: 400, title: "Expired");
        if (inv.UsedCount >= inv.MaxUses) return Problem(statusCode: 409, title: "Invite used");

        var existing = await db.ClubMembers.FirstOrDefaultAsync(m => m.ClubId == inv.ClubId && m.UserId == uid, ct);
        if (existing != null)
        {
            if (existing.MembershipStatus == ClubMembershipStatus.Active)
                return Problem(statusCode: 409, title: "Already a member");
            existing.MembershipStatus = ClubMembershipStatus.Active;
            existing.ActivatedAt = DateTime.UtcNow;
            existing.Role = ClubMemberRole.Member;
        }
        else
        {
            db.ClubMembers.Add(new ClubMember
            {
                ClubId = inv.ClubId,
                UserId = uid,
                Role = ClubMemberRole.Member,
                MembershipStatus = ClubMembershipStatus.Active,
                RequestedAt = DateTime.UtcNow,
                ActivatedAt = DateTime.UtcNow,
            });
        }

        inv.UsedCount++;
        await db.SaveChangesAsync(ct);

        return Ok(new { clubId = inv.ClubId, status = "active" });
    }

    public record PatchClubBody(string? Name, string? Description, string? Region, ClubVisibility? Visibility);

    [HttpPatch("{id:int}")]
    [Authorize]
    public async Task<IActionResult> Patch(int id, [FromBody] PatchClubBody body, CancellationToken ct)
    {
        var uid = CurrentUserId() ?? 0;
        var isAdmin = await db.ClubMembers.AnyAsync(
            m => m.ClubId == id && m.UserId == uid && m.Role == ClubMemberRole.Admin && m.MembershipStatus == ClubMembershipStatus.Active, ct);
        if (!isAdmin) return Forbid();

        var club = await db.CyclingClubs.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (club == null) return NotFound();

        if (body.Name != null) club.Name = body.Name.Trim();
        if (body.Description != null) club.Description = body.Description.Trim();
        if (body.Region != null) club.Region = string.IsNullOrWhiteSpace(body.Region) ? null : body.Region.Trim();
        if (body.Visibility.HasValue) club.Visibility = body.Visibility.Value;

        await db.SaveChangesAsync(ct);
        return Ok(new
        {
            id = club.Id,
            name = club.Name,
            description = club.Description,
            region = club.Region,
            visibility = club.Visibility == ClubVisibility.Public ? "public" : "private",
        });
    }

    [HttpPost("{id:int}/members/{userId:int}/promote")]
    [Authorize]
    public async Task<IActionResult> Promote(int id, int userId, CancellationToken ct)
    {
        var uid = CurrentUserId() ?? 0;
        var isAdmin = await db.ClubMembers.AnyAsync(
            m => m.ClubId == id && m.UserId == uid && m.Role == ClubMemberRole.Admin && m.MembershipStatus == ClubMembershipStatus.Active, ct);
        if (!isAdmin) return Forbid();

        var m = await db.ClubMembers.FirstOrDefaultAsync(x => x.ClubId == id && x.UserId == userId, ct);
        if (m == null || m.MembershipStatus != ClubMembershipStatus.Active) return NotFound();

        m.Role = ClubMemberRole.Admin;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("{id:int}/members/{userId:int}/demote")]
    [Authorize]
    public async Task<IActionResult> Demote(int id, int userId, CancellationToken ct)
    {
        var uid = CurrentUserId() ?? 0;
        var isAdmin = await db.ClubMembers.AnyAsync(
            m => m.ClubId == id && m.UserId == uid && m.Role == ClubMemberRole.Admin && m.MembershipStatus == ClubMembershipStatus.Active, ct);
        if (!isAdmin) return Forbid();

        var m = await db.ClubMembers.FirstOrDefaultAsync(x => x.ClubId == id && x.UserId == userId, ct);
        if (m == null || m.MembershipStatus != ClubMembershipStatus.Active) return NotFound();
        if (m.Role != ClubMemberRole.Admin) return BadRequest();

        var adminCount = await db.ClubMembers.CountAsync(
            x => x.ClubId == id && x.Role == ClubMemberRole.Admin && x.MembershipStatus == ClubMembershipStatus.Active, ct);
        if (adminCount <= 1)
            return Problem(statusCode: 400, title: "Cannot demote", detail: "Club must have at least one admin.");

        m.Role = ClubMemberRole.Member;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{id:int}/members/{userId:int}")]
    [Authorize]
    public async Task<IActionResult> RemoveMember(int id, int userId, CancellationToken ct)
    {
        var uid = CurrentUserId() ?? 0;
        var isAdmin = await db.ClubMembers.AnyAsync(
            m => m.ClubId == id && m.UserId == uid && m.Role == ClubMemberRole.Admin && m.MembershipStatus == ClubMembershipStatus.Active, ct);
        if (!isAdmin) return Forbid();

        var m = await db.ClubMembers.FirstOrDefaultAsync(x => x.ClubId == id && x.UserId == userId, ct);
        if (m == null) return NotFound();
        if (m.Role == ClubMemberRole.Admin)
        {
            var adminCount = await db.ClubMembers.CountAsync(
                x => x.ClubId == id && x.Role == ClubMemberRole.Admin && x.MembershipStatus == ClubMembershipStatus.Active, ct);
            if (adminCount <= 1)
                return Problem(statusCode: 400, title: "Cannot remove", detail: "Cannot remove the last admin.");
        }

        db.ClubMembers.Remove(m);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    public record CreateClubRideBody(
        string Name,
        string Description,
        DateTime ScheduledDate,
        int? RouteId,
        int MaxParticipants,
        bool ScheduleForWholeClub);

    [HttpPost("{id:int}/rides")]
    [Authorize]
    public async Task<IActionResult> CreateClubRide(int id, [FromBody] CreateClubRideBody body, CancellationToken ct)
    {
        if (!await db.CyclingClubs.AnyAsync(c => c.Id == id, ct)) return NotFound();
        if (body.RouteId is int routeIdCheck && !await db.Routes.AnyAsync(r => r.Id == routeIdCheck, ct)) return NotFound();

        var uid = CurrentUserId() ?? 0;
        var canLink = await db.ClubMembers.AnyAsync(
            m => m.ClubId == id && m.UserId == uid && m.MembershipStatus == ClubMembershipStatus.Active, ct);
        if (!canLink) return Forbid();

        var g = new RideGroup
        {
            Name = body.Name,
            Description = body.Description ?? "",
            ScheduledDate = body.ScheduledDate.ToUniversalTime(),
            RouteId = body.RouteId,
            MaxParticipants = body.MaxParticipants > 0 ? body.MaxParticipants : 20,
            ClubId = id,
            CreatedByUserId = uid,
        };
        db.RideGroups.Add(g);
        await db.SaveChangesAsync(ct);

        db.RideParticipants.Add(new RideParticipant { RideGroupId = g.Id, UserId = uid });

        if (body.ScheduleForWholeClub)
        {
            var isClubAdmin = await db.ClubMembers.AnyAsync(
                m => m.ClubId == id && m.UserId == uid && m.Role == ClubMemberRole.Admin && m.MembershipStatus == ClubMembershipStatus.Active, ct);
            if (!isClubAdmin)
            {
                await db.SaveChangesAsync(ct);
                var routeTitleEarly = await RouteTitleIfAnyAsync(g.RouteId, ct);
                return Ok(new
                {
                    id = g.Id,
                    name = g.Name,
                    description = g.Description,
                    scheduledDate = g.ScheduledDate,
                    routeId = g.RouteId,
                    routeTitle = routeTitleEarly,
                    participants = new[] { uid },
                    maxParticipants = g.MaxParticipants,
                    clubId = g.ClubId,
                });
            }

            var memberIds = await db.ClubMembers.AsNoTracking()
                .Where(m => m.ClubId == id && m.MembershipStatus == ClubMembershipStatus.Active)
                .OrderBy(m => m.UserId)
                .Select(m => m.UserId)
                .ToListAsync(ct);

            var added = new HashSet<int> { uid };
            foreach (var muid in memberIds)
            {
                if (added.Count >= g.MaxParticipants) break;
                if (added.Add(muid))
                    db.RideParticipants.Add(new RideParticipant { RideGroupId = g.Id, UserId = muid });
            }
        }

        await db.SaveChangesAsync(ct);

        var routeTitle = await RouteTitleIfAnyAsync(g.RouteId, ct);
        var finalParts = await db.RideParticipants.Where(p => p.RideGroupId == g.Id).Select(p => p.UserId).ToListAsync(ct);
        return Ok(new
        {
            id = g.Id,
            name = g.Name,
            description = g.Description,
            scheduledDate = g.ScheduledDate,
            routeId = g.RouteId,
            routeTitle = routeTitle,
            participants = finalParts,
            maxParticipants = g.MaxParticipants,
            clubId = g.ClubId,
        });
    }

    private async Task<string> RouteTitleIfAnyAsync(int? routeId, CancellationToken ct)
    {
        if (routeId is not int rid) return "";
        var r = await db.Routes.AsNoTracking().FirstOrDefaultAsync(x => x.Id == rid, ct);
        return r?.Title ?? "";
    }

    [HttpGet("{id:int}/rides")]
    [AllowAnonymous]
    public async Task<IActionResult> ClubRides(int id, CancellationToken ct)
    {
        var club = await db.CyclingClubs.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id, ct);
        if (club == null) return NotFound();

        var uid = CurrentUserId();
        var isActiveMember = uid != null && await db.ClubMembers.AnyAsync(
            m => m.ClubId == id && m.UserId == uid!.Value && m.MembershipStatus == ClubMembershipStatus.Active,
            ct);

        if (club.Visibility == ClubVisibility.Private && !isActiveMember)
        {
            var now = DateTime.UtcNow;
            var dates = await db.RideGroups.AsNoTracking()
                .Where(r => r.ClubId == id)
                .Select(r => r.ScheduledDate)
                .ToListAsync(ct);
            var upcomingCount = dates.Count(t => t >= now);
            var pastCount = dates.Count(t => t < now);
            return Ok(new { summaryOnly = true, upcomingCount, pastCount });
        }

        var canViewRoster = await RideGroupResponseHelper.ViewerCanSeeRoster(db, id, uid, ct);

        var rides = await db.RideGroups.AsNoTracking()
            .Include(r => r.Participants).ThenInclude(p => p.User)
            .Include(r => r.CreatedBy)
            .Include(r => r.Route)
            .Include(r => r.Club)
            .Where(r => r.ClubId == id)
            .OrderBy(r => r.ScheduledDate)
            .ToListAsync(ct);

        var rideIds = rides.Select(r => r.Id).ToList();
        var countRows = await db.RideParticipants.AsNoTracking()
            .Where(p => rideIds.Contains(p.RideGroupId))
            .GroupBy(p => p.RideGroupId)
            .Select(grp => new { grp.Key, Cnt = grp.Count() })
            .ToListAsync(ct);
        var countByRide = countRows.ToDictionary(x => x.Key, x => x.Cnt);

        Dictionary<int, bool> editMap = new();
        if (uid is { } viewerId)
            editMap = await RideGroupResponseHelper.BuildViewerCanEditMapAsync(db, rides, viewerId, ct);

        var items = rides
            .Select(r => RideGroupResponseHelper.ToResponse(
                r,
                canViewRoster,
                countByRide.GetValueOrDefault(r.Id, 0),
                uid != null && editMap.GetValueOrDefault(r.Id, false)))
            .ToList();
        return Ok(items);
    }
}
