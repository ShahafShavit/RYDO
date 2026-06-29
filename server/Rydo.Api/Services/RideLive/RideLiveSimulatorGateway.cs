using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;
using Rydo.Api.Hubs;
using Rydo.Api.Services;

namespace Rydo.Api.Services.RideLive;

/// <summary>
/// Publishes demo rider poses in-process (pose store + hub group broadcast).
/// Avoids loopback SignalR client JoinRide, which fails in Production ECS.
/// </summary>
public sealed class RideLiveSimulatorGateway(
    IServiceScopeFactory scopeFactory,
    RideLivePoseStore poseStore,
    IHubContext<RideLiveHub> hubContext,
    ILogger<RideLiveSimulatorGateway> logger)
{
    public async Task<ApplicationUser?> TryLoadEligibleSimulatorUserAsync(int rideId, int userId, CancellationToken ct)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<RydoDbContext>();
        if (!await MayJoinLiveAsync(db, rideId, userId, ct).ConfigureAwait(false))
        {
            logger.LogWarning(
                "Ride live simulator: user {UserId} cannot publish on ride {RideId} (not permitted or live unavailable).",
                userId,
                rideId);
            return null;
        }

        return await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct).ConfigureAwait(false);
    }

    public async Task PublishPoseAsync(
        int rideId,
        ApplicationUser user,
        double lat,
        double lng,
        double? headingDeg,
        double? accuracyM,
        string? atUtc,
        CancellationToken ct)
    {
        var dto = BuildPoseDto(user, lat, lng, headingDeg, accuracyM, atUtc);
        var stored = poseStore.SetPose(rideId, dto, "simulator_update");
        await hubContext.Clients
            .Group(RideLiveHub.GroupName(rideId))
            .SendAsync("RiderMoved", RideLiveWire.Pose(stored), ct)
            .ConfigureAwait(false);
    }

    private static async Task<bool> MayJoinLiveAsync(RydoDbContext db, int rideId, int userId, CancellationToken ct)
    {
        var ride = await db.Rides.AsNoTracking().FirstOrDefaultAsync(r => r.Id == rideId, ct).ConfigureAwait(false);
        if (ride == null || !RideEventWindow.LiveAvailable(ride))
            return false;
        return await db.RideParticipants.AnyAsync(p => p.RideId == rideId && p.UserId == userId, ct).ConfigureAwait(false);
    }

    private static RiderPoseDto BuildPoseDto(
        ApplicationUser user,
        double lat,
        double lng,
        double? headingDeg,
        double? accuracyM,
        string? atUtc)
    {
        var at = string.IsNullOrWhiteSpace(atUtc) ? DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ") : atUtc.Trim();
        return new RiderPoseDto(
            user.Id,
            DisplayName(user),
            UserPublicFields.RosterAvatarUrl(user),
            lat,
            lng,
            headingDeg,
            accuracyM,
            at);
    }

    private static string DisplayName(ApplicationUser u) =>
        string.Join(" ", new[] { u.FirstName, u.LastName }.Where(x => !string.IsNullOrWhiteSpace(x))).Trim();
}
