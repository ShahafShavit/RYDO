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
    RideLiveBotOrchestrator botOrchestrator,
    IHostEnvironment environment,
    ILogger<RideLiveHub> logger)
    : Hub
{

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
        RideLiveDiagnostics.Transport(
            logger,
            "connected",
            Context.ConnectionId,
            CurrentUserId(),
            null,
            "websocket_established");
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
            RideLiveDiagnostics.Transport(
                logger,
                "join_rejected",
                Context.ConnectionId,
                null,
                rideId,
                "unauthorized");
            throw new HubException("Unauthorized.");
        }

        var hasInitialPose = IsValidCoords(lat, lng);
        RideLiveDiagnostics.HubCallback(
            logger,
            "JoinRide",
            rideId,
            userId.Value,
            Context.ConnectionId,
            "start",
            detail: $"hasInitialPose={hasInitialPose}");

        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<RydoDbContext>();
        if (!await MayJoinLiveAsync(db, rideId, userId.Value, Context.ConnectionAborted))
        {
            RideLiveDiagnostics.Transport(
                logger,
                "join_rejected",
                Context.ConnectionId,
                userId.Value,
                rideId,
                "not_permitted");
            throw new HubException("You cannot join live for this ride.");
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, GroupName(rideId));
        Context.Items[JoinedRideIdItemKey] = rideId;
        poseStore.CancelScheduledRemoval(rideId, userId.Value, "JoinRide");

        var email = CurrentUserEmail();
        if (string.IsNullOrWhiteSpace(email))
        {
            email = await db.Users.AsNoTracking()
                .Where(u => u.Id == userId.Value)
                .Select(u => u.Email)
                .FirstOrDefaultAsync(Context.ConnectionAborted);
        }

        ScheduleDevBotsIfApplicable(rideId, userId.Value, email);

        var peerBroadcast = false;
        if (hasInitialPose)
        {
            var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId.Value, Context.ConnectionAborted);
            if (user != null)
            {
                var dto = BuildPoseDto(user, lat!.Value, lng!.Value, headingDeg, accuracyM, atUtc);
                var stored = poseStore.SetPose(rideId, dto, "join_initial_pose");
                await BroadcastRiderMovedAsync(rideId, stored, "join_initial_pose");
                peerBroadcast = true;
            }
        }
        else if (poseStore.TryGetPose(rideId, userId.Value, out var storedPose))
        {
            await BroadcastRiderMovedAsync(rideId, storedPose, "join_reconnect_rebroadcast");
            peerBroadcast = true;
        }

        var snapshot = poseStore.GetSnapshot(rideId);
        var riders = snapshot.Select(RideLiveWire.Pose).ToList();
        RideLiveDiagnostics.HubCallback(
            logger,
            "JoinRide",
            rideId,
            userId.Value,
            Context.ConnectionId,
            "completed",
            detail: $"peerCount={riders.Count} peerBroadcast={peerBroadcast} email={email ?? "(none)"}");
        await Clients.Caller.SendAsync("RidersState", new { riders });
    }

    public async Task UpdatePose(double lat, double lng, double? headingDeg, double? accuracyM, string? atUtc)
    {
        if (!TryGetJoinedRideId(out var rideId))
        {
            if (!Context.Items.ContainsKey(WarnedNoJoinItemKey))
            {
                Context.Items[WarnedNoJoinItemKey] = true;
                RideLiveDiagnostics.Skipped(
                    logger,
                    "hub",
                    0,
                    CurrentUserId() ?? 0,
                    "UpdatePose",
                    "connection_never_joined_ride",
                    detail: $"connection={Context.ConnectionId}");
            }

            return;
        }

        var userId = CurrentUserId();
        if (userId == null)
        {
            RideLiveDiagnostics.Skipped(
                logger,
                "hub",
                rideId,
                0,
                "UpdatePose",
                "missing_user_id",
                detail: $"connection={Context.ConnectionId}");
            return;
        }

        if (!rateLimiter.TryAllow(rideId, userId.Value, RideLiveTiming.PoseHeartbeatIntervalMs, DateTime.UtcNow))
        {
            RideLiveDiagnostics.Skipped(
                logger,
                "hub",
                rideId,
                userId.Value,
                "UpdatePose",
                "rate_limited",
                detail: $"minIntervalMs={RideLiveTiming.PoseHeartbeatIntervalMs} connection={Context.ConnectionId}");
            return;
        }

        if (!IsValidCoords(lat, lng))
        {
            RideLiveDiagnostics.Skipped(
                logger,
                "hub",
                rideId,
                userId.Value,
                "UpdatePose",
                "invalid_coordinates",
                detail: $"lat={lat} lng={lng}");
            return;
        }

        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<RydoDbContext>();
        var dto = await TryBuildPoseDtoAsync(db, rideId, userId.Value, lat, lng, headingDeg, accuracyM, atUtc, Context.ConnectionAborted);
        if (dto == null)
            return;

        var stored = poseStore.SetPose(rideId, dto, "UpdatePose");
        await BroadcastRiderMovedAsync(rideId, stored, "UpdatePose");
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var joined = TryGetJoinedRideId(out var rideIdFromContext);
        var userId = CurrentUserId();
        var reason = exception == null
            ? "clean_disconnect"
            : $"disconnect_with_exception:{exception.GetType().Name}";

        RideLiveDiagnostics.Transport(
            logger,
            "disconnected",
            Context.ConnectionId,
            userId,
            joined ? rideIdFromContext : null,
            reason,
            exception);

        if (joined && userId != null)
        {
            poseStore.ScheduleRiderRemoval(rideIdFromContext, userId.Value);
        }

        await base.OnDisconnectedAsync(exception);
    }

    private async Task BroadcastRiderMovedAsync(int rideId, RiderPoseDto dto, string reason)
    {
        var wire = RideLiveWire.Pose(dto);
        await Clients.GroupExcept(GroupName(rideId), Context.ConnectionId).SendAsync("RiderMoved", wire);
        RideLiveDiagnostics.Broadcast(
            logger,
            "RiderMoved",
            rideId,
            dto.UserId,
            reason,
            dto.IsStale,
            detail: $"connection={Context.ConnectionId}");
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
            RideLiveDiagnostics.Skipped(
                logger,
                "hub",
                rideId,
                userId,
                "UpdatePose",
                "not_ride_participant");
            return null;
        }

        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user == null)
        {
            RideLiveDiagnostics.Skipped(
                logger,
                "hub",
                rideId,
                userId,
                "UpdatePose",
                "user_row_missing");
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

    private void ScheduleDevBotsIfApplicable(int rideId, int triggeringUserId, string? triggeringEmail)
    {
        if (!environment.IsDevelopment())
            return;

        logger.LogInformation(
            "{Tag} dev_bots scheduling ride={RideId} joinerUser={UserId} email={Email}",
            RideLiveDiagnostics.Tag,
            rideId,
            triggeringUserId,
            triggeringEmail ?? "(none)");

        _ = Task.Run(async () =>
        {
            try
            {
                await botOrchestrator.TryStartBotsForRideAsync(rideId, triggeringUserId, triggeringEmail)
                    .ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "{Tag} dev_bots orchestration_failed ride={RideId}", RideLiveDiagnostics.Tag, rideId);
            }
        });
    }
}
