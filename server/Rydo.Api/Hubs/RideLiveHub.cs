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
    private static readonly object WarnedNoJoinItemKey = new();

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

    public async Task JoinRide(
        int rideId,
        double? lat = null,
        double? lng = null,
        double? headingDeg = null,
        double? accuracyM = null,
        string? atUtc = null)
    {
        var userId = CurrentUserId();
        if (userId == null)
        {
            logger.LogWarning("Ride live hub JoinRide rejected: unauthorized connection {ConnectionId}", Context.ConnectionId);
            throw new HubException("Unauthorized.");
        }

        var hasInitialPose = IsValidCoords(lat, lng);
        logger.LogDebug(
            "Ride live hub JoinRide start: connection {ConnectionId} user {UserId} ride {RideId} hasInitialPose {HasInitialPose}",
            Context.ConnectionId,
            userId.Value,
            rideId,
            hasInitialPose);

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
        poseStore.CancelScheduledRemoval(rideId, userId.Value);
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

        var peerBroadcast = false;
        if (hasInitialPose)
        {
            var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId.Value, Context.ConnectionAborted);
            if (user != null)
            {
                var dto = BuildPoseDto(user, lat!.Value, lng!.Value, headingDeg, accuracyM, atUtc);
                var stored = poseStore.SetPose(rideId, dto);
                await BroadcastRiderMovedAsync(rideId, stored);
                peerBroadcast = true;
                logger.LogDebug(
                    "Ride live hub JoinRide: initial pose broadcast ride {RideId} user {UserId} lat {Lat:F6} lng {Lng:F6}",
                    rideId,
                    userId.Value,
                    lat,
                    lng);
            }
        }
        else if (poseStore.TryGetPose(rideId, userId.Value, out var storedPose))
        {
            await BroadcastRiderMovedAsync(rideId, storedPose);
            peerBroadcast = true;
            logger.LogDebug(
                "Ride live hub JoinRide: grace reconnect pose broadcast ride {RideId} user {UserId}",
                rideId,
                userId.Value);
        }

        var snapshot = poseStore.GetSnapshot(rideId);
        var riders = snapshot.Select(RideLiveWire.Pose).ToList();
        logger.LogInformation(
            "Ride live hub: user {UserId} connection {ConnectionId} joined ride {RideId}, sending RidersState with {PeerCount} pose(s), peerBroadcast {PeerBroadcast}; joiner email: {Email}.",
            userId.Value,
            Context.ConnectionId,
            rideId,
            riders.Count,
            peerBroadcast,
            string.IsNullOrWhiteSpace(email) ? "(none)" : email);
        await Clients.Caller.SendAsync("RidersState", new { riders });
    }

    public async Task UpdatePose(double lat, double lng, double? headingDeg, double? accuracyM, string? atUtc)
    {
        if (!TryGetJoinedRideId(out var rideId))
        {
            if (!Context.Items.ContainsKey(WarnedNoJoinItemKey))
            {
                Context.Items[WarnedNoJoinItemKey] = true;
                logger.LogWarning(
                    "Ride live hub UpdatePose ignored: connection {ConnectionId} never called JoinRide on this connection (reconnect without re-join?)",
                    Context.ConnectionId);
            }

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

        if (!IsValidCoords(lat, lng))
        {
            logger.LogDebug(
                "Ride live hub UpdatePose ignored: invalid lat/lng ride {RideId} user {UserId}",
                rideId,
                userId.Value);
            return;
        }

        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<RydoDbContext>();
        var dto = await TryBuildPoseDtoAsync(db, rideId, userId.Value, lat, lng, headingDeg, accuracyM, atUtc, Context.ConnectionAborted);
        if (dto == null)
            return;

        var stored = poseStore.SetPose(rideId, dto);
        await BroadcastRiderMovedAsync(rideId, stored);
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
                poseStore.ScheduleRiderRemoval(rideId, userId.Value);
                logger.LogDebug(
                    "Ride live hub disconnect: scheduled pose removal (grace) ride {RideId} user {UserId}",
                    rideId,
                    userId.Value);
            }
        }

        await base.OnDisconnectedAsync(exception);
    }

    private async Task BroadcastRiderMovedAsync(int rideId, RiderPoseDto dto)
    {
        var wire = RideLiveWire.Pose(dto);
        await Clients.GroupExcept(GroupName(rideId), Context.ConnectionId).SendAsync("RiderMoved", wire);
    }

    private async Task<RiderPoseDto?> TryBuildPoseDtoAsync(
        RydoDbContext db,
        int rideId,
        int userId,
        double lat,
        double lng,
        double? headingDeg,
        double? accuracyM,
        string? atUtc,
        CancellationToken ct)
    {
        if (!await db.RideParticipants.AnyAsync(p => p.RideId == rideId && p.UserId == userId, ct))
        {
            logger.LogDebug(
                "Ride live hub UpdatePose ignored: user {UserId} not a participant of ride {RideId}",
                userId,
                rideId);
            return null;
        }

        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user == null)
        {
            logger.LogDebug("Ride live hub UpdatePose ignored: user {UserId} row missing", userId);
            return null;
        }

        return BuildPoseDto(user, lat, lng, headingDeg, accuracyM, atUtc);
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

    private static bool IsValidCoords(double? lat, double? lng) =>
        lat is { } la && lng is { } ln && double.IsFinite(la) && double.IsFinite(ln);

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

}
