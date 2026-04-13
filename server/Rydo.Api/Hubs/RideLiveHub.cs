using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;
using Rydo.Api.Services;
using Rydo.Api.Services.RideLive;

namespace Rydo.Api.Hubs;

[Authorize]
public class RideLiveHub(
    IServiceScopeFactory scopeFactory,
    RideLivePoseStore poseStore,
    RideLiveRateLimiter rateLimiter,
    IRideLiveSessionCoordinator sessionCoordinator,
    ILogger<RideLiveHub> logger)
    : Hub
{
    public const int MinPoseIntervalMs = 2000;

    private int? _joinedRideId;

    public static string GroupName(int rideId) => $"ride_live_{rideId}";

    public async Task JoinRide(int rideId)
    {
        var userId = CurrentUserId();
        if (userId == null)
            throw new HubException("Unauthorized.");

        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<RydoDbContext>();
        if (!await MayJoinLiveAsync(db, rideId, userId.Value, Context.ConnectionAborted))
            throw new HubException("You cannot join live for this ride.");

        await Groups.AddToGroupAsync(Context.ConnectionId, GroupName(rideId));
        _joinedRideId = rideId;

        var email = CurrentUserEmail();
        if (string.IsNullOrWhiteSpace(email))
        {
            email = await db.Users.AsNoTracking()
                .Where(u => u.Id == userId.Value)
                .Select(u => u.Email)
                .FirstOrDefaultAsync(Context.ConnectionAborted);
        }

        sessionCoordinator.EnsureStarted(rideId, userId.Value, email);

        var snapshot = poseStore.GetSnapshot(rideId);
        await Clients.Caller.SendAsync("RidersState", new { riders = snapshot.Select(WirePose).ToList() });
    }

    public async Task UpdatePose(double lat, double lng, double? headingDeg, double? accuracyM, string? atUtc)
    {
        if (_joinedRideId is not int rideId)
            return;

        var userId = CurrentUserId();
        if (userId == null)
            return;

        if (!rateLimiter.TryAllow(rideId, userId.Value, MinPoseIntervalMs, DateTime.UtcNow))
            return;

        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<RydoDbContext>();
        if (!await db.RideParticipants.AnyAsync(p => p.RideId == rideId && p.UserId == userId.Value, Context.ConnectionAborted))
            return;

        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId.Value, Context.ConnectionAborted);
        if (user == null)
            return;

        var displayName = DisplayName(user);
        var at = string.IsNullOrWhiteSpace(atUtc) ? DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ") : atUtc.Trim();
        var dto = new RiderPoseDto(
            user.Id,
            displayName,
            UserPublicFields.RosterAvatarUrl(user),
            lat,
            lng,
            headingDeg,
            accuracyM,
            at);
        poseStore.SetPose(rideId, dto);

        var wire = WirePose(dto);
        await Clients.GroupExcept(GroupName(rideId), Context.ConnectionId).SendAsync("RiderMoved", wire);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (_joinedRideId is int rideId)
        {
            var userId = CurrentUserId();
            if (userId != null)
            {
                poseStore.RemoveRider(rideId, userId.Value);
                try
                {
                    await Clients.Group(GroupName(rideId)).SendAsync("RiderLeft", new { userId = userId.Value });
                }
                catch (Exception ex)
                {
                    logger.LogDebug(ex, "RiderLeft broadcast failed on disconnect");
                }
            }
        }

        await base.OnDisconnectedAsync(exception);
    }

    private int? CurrentUserId()
    {
        var s = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(s, out var id) ? id : null;
    }

    private string? CurrentUserEmail() =>
        Context.User?.FindFirstValue(ClaimTypes.Email)
        ?? Context.User?.FindFirstValue(JwtRegisteredClaimNames.Email);

    private static async Task<bool> MayJoinLiveAsync(RydoDbContext db, int rideId, int userId, CancellationToken ct)
    {
        var ride = await db.Rides.AsNoTracking().FirstOrDefaultAsync(r => r.Id == rideId, ct);
        if (ride == null || ride.RouteId == null || ride.Kind == RideKind.SoloLog)
            return false;
        return await db.RideParticipants.AnyAsync(p => p.RideId == rideId && p.UserId == userId, ct);
    }

    private static string DisplayName(ApplicationUser u) =>
        string.Join(" ", new[] { u.FirstName, u.LastName }.Where(x => !string.IsNullOrWhiteSpace(x))).Trim();

    private static object WirePose(RiderPoseDto r) => new
    {
        userId = r.UserId,
        displayName = r.DisplayName,
        avatarUrl = r.AvatarUrl,
        lat = r.Lat,
        lng = r.Lng,
        headingDeg = r.HeadingDeg,
        accuracyM = r.AccuracyM,
        atUtc = r.AtUtc,
    };
}
