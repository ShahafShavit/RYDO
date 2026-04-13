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

    /// <summary>Per-connection state — hub instances are transient; do not use instance fields for JoinRide → UpdatePose.</summary>
    private static readonly object JoinedRideIdItemKey = new();

    public static string GroupName(int rideId) => $"ride_live_{rideId}";

    private bool TryGetJoinedRideId(out int rideId)
    {
        if (Context.Items.TryGetValue(JoinedRideIdItemKey, out var boxed) && boxed is int id)
        {
            rideId = id;
            return true;
        }

        rideId = default;
        return false;
    }

    public override async Task OnConnectedAsync()
    {
        logger.LogDebug(
            "Ride live hub: connected connection {ConnectionId} user {UserId}",
            Context.ConnectionId,
            CurrentUserId()?.ToString() ?? "(not yet authenticated)");
        await base.OnConnectedAsync();
    }

    public async Task JoinRide(int rideId)
    {
        var userId = CurrentUserId();
        if (userId == null)
        {
            logger.LogWarning("Ride live hub JoinRide rejected: unauthorized connection {ConnectionId}", Context.ConnectionId);
            throw new HubException("Unauthorized.");
        }

        logger.LogDebug("Ride live hub JoinRide start: connection {ConnectionId} user {UserId} ride {RideId}", Context.ConnectionId, userId.Value, rideId);

        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<RydoDbContext>();
        if (!await MayJoinLiveAsync(db, rideId, userId.Value, Context.ConnectionAborted))
        {
            logger.LogWarning(
                "Ride live hub JoinRide rejected: user {UserId} may not join live ride {RideId} (connection {ConnectionId})",
                userId.Value,
                rideId,
                Context.ConnectionId);
            throw new HubException("You cannot join live for this ride.");
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, GroupName(rideId));
        Context.Items[JoinedRideIdItemKey] = rideId;
        logger.LogDebug(
            "Ride live hub: connection {ConnectionId} added to group {Group}",
            Context.ConnectionId,
            GroupName(rideId));

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
        var riders = snapshot.Select(WirePose).ToList();
        logger.LogInformation(
            "Ride live hub: user {UserId} connection {ConnectionId} joined ride {RideId}, sending RidersState with {PeerCount} pose(s); joiner email: {Email}.",
            userId.Value,
            Context.ConnectionId,
            rideId,
            riders.Count,
            string.IsNullOrWhiteSpace(email) ? "(none)" : email);
        await Clients.Caller.SendAsync("RidersState", new { riders });
    }

    public async Task UpdatePose(double lat, double lng, double? headingDeg, double? accuracyM, string? atUtc)
    {
        if (!TryGetJoinedRideId(out var rideId))
        {
            logger.LogDebug(
                "Ride live hub UpdatePose ignored: connection {ConnectionId} never called JoinRide (no ride id on connection context)",
                Context.ConnectionId);
            return;
        }

        var userId = CurrentUserId();
        if (userId == null)
        {
            logger.LogDebug("Ride live hub UpdatePose ignored: no user id on connection {ConnectionId}", Context.ConnectionId);
            return;
        }

        if (!rateLimiter.TryAllow(rideId, userId.Value, MinPoseIntervalMs, DateTime.UtcNow))
        {
            logger.LogDebug(
                "Ride live hub UpdatePose rate-limited: ride {RideId} user {UserId} connection {ConnectionId}",
                rideId,
                userId.Value,
                Context.ConnectionId);
            return;
        }

        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<RydoDbContext>();
        if (!await db.RideParticipants.AnyAsync(p => p.RideId == rideId && p.UserId == userId.Value, Context.ConnectionAborted))
        {
            logger.LogDebug(
                "Ride live hub UpdatePose ignored: user {UserId} not a participant of ride {RideId}",
                userId.Value,
                rideId);
            return;
        }

        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId.Value, Context.ConnectionAborted);
        if (user == null)
        {
            logger.LogDebug("Ride live hub UpdatePose ignored: user {UserId} row missing", userId.Value);
            return;
        }

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
        logger.LogDebug(
            "Ride live hub RiderMoved broadcast: ride {RideId} from user {UserId} connection {ConnectionId} lat {Lat:F6} lng {Lng:F6} → group {Group} (excluding sender)",
            rideId,
            userId.Value,
            Context.ConnectionId,
            lat,
            lng,
            GroupName(rideId));
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var joined = TryGetJoinedRideId(out var rideIdFromContext);
        var rideLabel = joined ? rideIdFromContext.ToString() : "(none)";
        if (exception != null)
        {
            logger.LogDebug(
                exception,
                "Ride live hub disconnect: connection {ConnectionId} joinedRide {JoinedRide} user {UserId}",
                Context.ConnectionId,
                rideLabel,
                CurrentUserId()?.ToString() ?? "(none)");
        }
        else
        {
            logger.LogDebug(
                "Ride live hub disconnect: connection {ConnectionId} joinedRide {JoinedRide} user {UserId}",
                Context.ConnectionId,
                rideLabel,
                CurrentUserId()?.ToString() ?? "(none)");
        }

        if (joined)
        {
            var rideId = rideIdFromContext;
            var userId = CurrentUserId();
            if (userId != null)
            {
                poseStore.RemoveRider(rideId, userId.Value);
                try
                {
                    await Clients.Group(GroupName(rideId)).SendAsync("RiderLeft", new { userId = userId.Value });
                    logger.LogDebug(
                        "Ride live hub RiderLeft broadcast: ride {RideId} user {UserId}",
                        rideId,
                        userId.Value);
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
