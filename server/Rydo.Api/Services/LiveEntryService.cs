using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Rydo.Api.Data;

namespace Rydo.Api.Services;

public sealed class LiveEntryService(
    RydoDbContext db,
    UserManager<ApplicationUser> users,
    JwtTokenService jwt,
    RideParticipantService participantService,
    IOptionsMonitor<DemoLiveEntryOptions> options)
{
    public bool IsEnabled => options.CurrentValue.Enabled;

    public async Task<Ride?> FindDemoRideAsync(CancellationToken ct) =>
        await db.Rides.AsNoTracking()
            .Include(r => r.Route)
            .FirstOrDefaultAsync(r => r.Name == options.CurrentValue.RideName, ct);

    public async Task<LiveEntryPreview?> GetPreviewAsync(CancellationToken ct)
    {
        var ride = await FindDemoRideAsync(ct);
        if (ride == null) return null;
        return new LiveEntryPreview(
            ride.Id,
            ride.Name,
            ride.Route?.Title ?? "Route",
            ride.ScheduledDate.ToUniversalTime());
    }

    public async Task<(string Token, DateTime ExpiresAt)> CreateChallengeAsync(string? clientIp, CancellationToken ct)
    {
        var ride = await FindDemoRideAsync(ct)
            ?? throw new InvalidOperationException("Demo live-entry ride is not configured.");

        var opt = options.CurrentValue;
        var token = Guid.NewGuid().ToString("N");
        var now = DateTime.UtcNow;
        var challenge = new LiveEntryChallenge
        {
            Token = token,
            CreatedAt = now,
            ExpiresAt = now.AddSeconds(opt.ChallengeTtlSeconds),
            ClientIp = clientIp,
            RideId = ride.Id,
        };
        db.LiveEntryChallenges.Add(challenge);
        await db.SaveChangesAsync(ct);
        return (token, challenge.ExpiresAt);
    }

    public async Task<LiveEntryRedeemResult> RedeemAsync(string entryToken, CancellationToken ct)
    {
        var opt = options.CurrentValue;
        await using var tx = await db.Database.BeginTransactionAsync(ct);

        var challenge = await db.LiveEntryChallenges
            .FirstOrDefaultAsync(c => c.Token == entryToken, ct)
            ?? throw new LiveEntryException("Invalid entry token.", 404);

        if (challenge.UsedAt != null)
            throw new LiveEntryException("Entry token already used.", 409);
        if (challenge.ExpiresAt < DateTime.UtcNow)
            throw new LiveEntryException("Entry token expired.", 400);

        var ride = await db.Rides.AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == challenge.RideId, ct)
            ?? throw new LiveEntryException("Demo ride not found.", 404);

        var (user, riderIndex) = await AssignNextRiderAsync(ct);
        await participantService.EnsureParticipantAsync(ride.Id, user.Id, ct);

        var roles = await users.GetRolesAsync(user);
        var token = jwt.CreateToken(user, roles);

        challenge.UsedAt = DateTime.UtcNow;
        challenge.AssignedUserId = user.Id;
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        var role = roles.Contains("admin", StringComparer.OrdinalIgnoreCase) ? "admin" : "user";
        return new LiveEntryRedeemResult(
            token,
            user.Id,
            user.FirstName,
            user.LastName,
            user.Email ?? "",
            AvatarUrls.ResolveUserDisplay(user),
            role,
            ride.Id,
            riderIndex);
    }

    private async Task<(ApplicationUser User, int RiderIndex)> AssignNextRiderAsync(CancellationToken ct)
    {
        var opt = options.CurrentValue;
        if (opt.RiderCount <= 0)
            throw new LiveEntryException("Rider pool is not configured.", 500);

        var state = await db.LiveEntryStates.FirstOrDefaultAsync(s => s.Id == 1, ct);
        if (state == null)
        {
            state = new LiveEntryState { Id = 1, LastRiderIndex = -1 };
            db.LiveEntryStates.Add(state);
            await db.SaveChangesAsync(ct);
        }

        // Re-load with lock for SQL Server
        await db.Database.ExecuteSqlRawAsync("SELECT 1 FROM LiveEntryStates WITH (UPDLOCK, ROWLOCK) WHERE Id = 1", ct);
        state = await db.LiveEntryStates.FirstAsync(s => s.Id == 1, ct);

        var nextIndex = (state.LastRiderIndex + 1) % opt.RiderCount;
        state.LastRiderIndex = nextIndex;
        await db.SaveChangesAsync(ct);

        var email = opt.RiderEmail(nextIndex);
        var user = await users.FindByEmailAsync(email)
            ?? throw new LiveEntryException($"Demo rider {email} not found. Recreate the database.", 500);

        return (user, nextIndex);
    }

    public async Task EnsureStateRowAsync(CancellationToken ct)
    {
        if (!await db.LiveEntryStates.AnyAsync(s => s.Id == 1, ct))
        {
            db.LiveEntryStates.Add(new LiveEntryState { Id = 1, LastRiderIndex = -1 });
            await db.SaveChangesAsync(ct);
        }
    }
}

public sealed record LiveEntryPreview(int RideId, string RideName, string RouteTitle, DateTime ScheduledDate);

public sealed record LiveEntryRedeemResult(
    string Token,
    int UserId,
    string FirstName,
    string LastName,
    string Email,
    string? AvatarUrl,
    string Role,
    int RideId,
    int RiderIndex);

public sealed class LiveEntryException(string message, int statusCode) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
}
