using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;

namespace Rydo.Api.Services;

public static class RideInviteHelper
{
    public static (int Lower, int Higher) CanonicalPair(int a, int b) => a < b ? (a, b) : (b, a);

    public static async Task<bool> AreFriendsAsync(RydoDbContext db, int userA, int userB, CancellationToken ct)
    {
        var (lo, hi) = CanonicalPair(userA, userB);
        return await db.Friendships.AsNoTracking()
            .AnyAsync(f => f.UserIdLower == lo && f.UserIdHigher == hi, ct);
    }

    public static async Task<int> CountOccupiedSlotsAsync(RydoDbContext db, int rideId, CancellationToken ct)
    {
        var participantCount = await db.RideParticipants.CountAsync(p => p.RideId == rideId, ct);
        var pendingInvites = await db.RideInvites.CountAsync(
            i => i.RideId == rideId && i.Status == RideInviteStatus.Pending, ct);
        return participantCount + pendingInvites;
    }

    public static async Task NotifyClubRideCreatedAsync(
        RydoDbContext db,
        Ride ride,
        int creatorUserId,
        CancellationToken ct)
    {
        if (ride.ClubId is not int clubId)
            return;

        var memberIds = await db.ClubMembers.AsNoTracking()
            .Where(m => m.ClubId == clubId
                && m.MembershipStatus == ClubMembershipStatus.Active
                && m.UserId != creatorUserId)
            .Select(m => m.UserId)
            .ToListAsync(ct);

        if (memberIds.Count == 0)
            return;

        var now = DateTime.UtcNow;
        foreach (var memberId in memberIds)
        {
            db.InboxItems.Add(new InboxItem
            {
                RecipientUserId = memberId,
                Kind = InboxItemKind.ClubRideAnnounced,
                RideId = ride.Id,
                ClubId = clubId,
                CreatedAt = now,
            });
        }

        await db.SaveChangesAsync(ct);
    }
}
