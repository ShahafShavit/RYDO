using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;

namespace Rydo.Api.Services;

public sealed class RideParticipantService(RydoDbContext db)
{
    public async Task EnsureParticipantAsync(int rideId, int userId, CancellationToken ct)
    {
        if (await db.RideParticipants.AnyAsync(p => p.RideId == rideId && p.UserId == userId, ct))
            return;

        var ride = await db.Rides.AsNoTracking().FirstOrDefaultAsync(r => r.Id == rideId, ct)
            ?? throw new InvalidOperationException($"Ride {rideId} not found.");

        if (ride.Kind == RideKind.SoloLog)
            throw new InvalidOperationException("This ride cannot accept additional participants.");

        if (ride.ClubId is int cid)
        {
            var isMember = await db.ClubMembers.AnyAsync(
                m => m.ClubId == cid && m.UserId == userId && m.MembershipStatus == ClubMembershipStatus.Active, ct);
            if (!isMember)
                throw new InvalidOperationException("User is not an active club member for this ride.");
        }

        var count = await db.RideParticipants.CountAsync(p => p.RideId == rideId, ct);
        if (count >= ride.MaxParticipants)
            throw new InvalidOperationException("Ride has reached max participants.");

        db.RideParticipants.Add(new RideParticipant { RideId = rideId, UserId = userId });
        await db.SaveChangesAsync(ct);
    }
}
