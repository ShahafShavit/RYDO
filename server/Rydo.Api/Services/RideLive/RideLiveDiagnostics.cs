namespace Rydo.Api.Services.RideLive;

/// <summary>Structured ride-live diagnostics — filter CloudWatch with <c>[RideLive]</c>.</summary>
public static class RideLiveDiagnostics
{
    public const string Tag = "[RideLive]";

    public static void StateTransition(
        ILogger logger,
        int rideId,
        int userId,
        string machine,
        string from,
        string to,
        string reason,
        string? connectionId = null,
        string? detail = null)
    {
        logger.Log(
            LogLevel.Debug,
            "{Tag} state machine={Machine} ride={RideId} user={UserId} {From}->{To} reason={Reason} connection={ConnectionId}{Detail}",
            Tag,
            machine,
            rideId,
            userId,
            from,
            to,
            reason,
            connectionId ?? "-",
            detail is null ? "" : $" detail={detail}");
    }

    public static void Timer(
        ILogger logger,
        string action,
        string timer,
        int rideId,
        int userId,
        string reason,
        int? delaySeconds = null,
        string? detail = null)
    {
        var level = LogLevel.Debug;

        logger.Log(
            level,
            "{Tag} timer {Action} kind={Timer} ride={RideId} user={UserId} reason={Reason}{Delay}{Detail}",
            Tag,
            action,
            timer,
            rideId,
            userId,
            reason,
            delaySeconds is null ? "" : $" delaySec={delaySeconds}",
            detail is null ? "" : $" detail={detail}");
    }

    public static void Transport(
        ILogger logger,
        string phase,
        string connectionId,
        int? userId,
        int? rideId,
        string reason,
        Exception? exception = null,
        string? detail = null)
    {
        var level = LogLevel.Debug;

        if (exception != null)
        {
            logger.Log(
                level,
                exception,
                "{Tag} transport {Phase} connection={ConnectionId} user={UserId} ride={RideId} reason={Reason}{Detail}",
                Tag,
                phase,
                connectionId,
                userId?.ToString() ?? "-",
                rideId?.ToString() ?? "-",
                reason,
                detail is null ? "" : $" detail={detail}");
            return;
        }

        logger.Log(
            level,
            "{Tag} transport {Phase} connection={ConnectionId} user={UserId} ride={RideId} reason={Reason}{Detail}",
            Tag,
            phase,
            connectionId,
            userId?.ToString() ?? "-",
            rideId?.ToString() ?? "-",
            reason,
            detail is null ? "" : $" detail={detail}");
    }

    public static void HubCallback(
        ILogger logger,
        string callback,
        int rideId,
        int userId,
        string connectionId,
        string reason,
        string? detail = null)
    {
        var level = LogLevel.Debug;

        logger.Log(
            level,
            "{Tag} hub {Callback} ride={RideId} user={UserId} connection={ConnectionId} reason={Reason}{Detail}",
            Tag,
            callback,
            rideId,
            userId,
            connectionId,
            reason,
            detail is null ? "" : $" detail={detail}");
    }

    public static void Pose(
        ILogger logger,
        LogLevel level,
        int rideId,
        int userId,
        string phase,
        string reason,
        double? lat = null,
        double? lng = null,
        bool? isStale = null,
        string? connectionId = null,
        string? detail = null)
    {
        logger.Log(
            level,
            "{Tag} pose {Phase} ride={RideId} user={UserId} reason={Reason} lat={Lat} lng={Lng} isStale={IsStale} connection={ConnectionId}{Detail}",
            Tag,
            phase,
            rideId,
            userId,
            reason,
            lat?.ToString("F6") ?? "-",
            lng?.ToString("F6") ?? "-",
            isStale?.ToString() ?? "-",
            connectionId ?? "-",
            detail is null ? "" : $" detail={detail}");
    }

    public static void Broadcast(
        ILogger logger,
        string eventName,
        int rideId,
        int subjectUserId,
        string reason,
        bool? isStale = null,
        string? detail = null)
    {
        var level = LogLevel.Debug;

        logger.Log(
            level,
            "{Tag} broadcast {Event} ride={RideId} subjectUser={SubjectUserId} reason={Reason} isStale={IsStale}{Detail}",
            Tag,
            eventName,
            rideId,
            subjectUserId,
            reason,
            isStale?.ToString() ?? "-",
            detail is null ? "" : $" detail={detail}");
    }

    public static void Skipped(
        ILogger logger,
        string component,
        int rideId,
        int userId,
        string action,
        string reason,
        string? detail = null)
    {
        var level = reason is "connection_never_joined_ride" or "not_permitted"
            ? LogLevel.Warning
            : LogLevel.Debug;

        logger.Log(
            level,
            "{Tag} skipped component={Component} action={Action} ride={RideId} user={UserId} reason={Reason}{Detail}",
            Tag,
            component,
            action,
            rideId,
            userId,
            reason,
            detail is null ? "" : $" detail={detail}");
    }

}
