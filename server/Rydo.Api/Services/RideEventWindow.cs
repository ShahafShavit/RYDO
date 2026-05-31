using Rydo.Api.Data;

namespace Rydo.Api.Services;

/// <summary>
/// Shared 48-hour ride event window anchored on <see cref="Ride.ScheduledDate"/>.
/// Used by live ride, ride chat, and edit rules.
/// </summary>
public static class RideEventWindow
{
    public const int HoursAfterStart = 48;

    public static DateTime ClosesAt(Ride ride) =>
        ride.ScheduledDate.ToUniversalTime().AddHours(HoursAfterStart);

    public static bool HasStarted(Ride ride) =>
        DateTime.UtcNow >= ride.ScheduledDate.ToUniversalTime();

    /// <summary>Before start or within 48h after scheduled start.</summary>
    public static bool IsOpen(Ride ride) =>
        DateTime.UtcNow < ClosesAt(ride);

    public static bool ChatWritable(Ride ride) => IsOpen(ride);

    public static bool LiveAvailable(Ride ride) =>
        ride.Kind == RideKind.Scheduled && ride.RouteId != null && IsOpen(ride);

    public static bool CanEdit(Ride ride) => IsOpen(ride);

    public static bool CanEditScheduledDate(Ride ride) => !HasStarted(ride);

    public static object ToPayload(Ride ride) => new
    {
        closesAt = ClosesAt(ride).ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
        hasStarted = HasStarted(ride),
        liveAvailable = LiveAvailable(ride),
        chatReadOnly = !ChatWritable(ride),
        canEditScheduledDate = CanEditScheduledDate(ride),
    };
}
