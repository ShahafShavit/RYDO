namespace Rydo.Api.Services.RideLive;

public enum RiderPresence
{
    Absent,
    Grace,
    Present,
}

public enum PoseLiveness
{
    Live,
    Stale,
}

/// <summary>Per-rider session: presence (hub connection) and pose liveness (GPS heartbeat).</summary>
public sealed record RideLiveRiderSession(
    RiderPoseDto Pose,
    RiderPresence Presence,
    PoseLiveness Liveness,
    DateTime LastPoseAtUtc)
{
    public static RideLiveRiderSession FromJoin(RiderPoseDto pose, DateTime utcNow) =>
        new(
            pose with { IsStale = false },
            RiderPresence.Present,
            PoseLiveness.Live,
            utcNow);

    public RideLiveRiderSession WithPose(RiderPoseDto pose, DateTime utcNow) =>
        this with
        {
            Pose = pose with { IsStale = false },
            Presence = RiderPresence.Present,
            Liveness = PoseLiveness.Live,
            LastPoseAtUtc = utcNow,
        };

    public RideLiveRiderSession WithGrace() =>
        this with { Presence = RiderPresence.Grace };

    public RideLiveRiderSession WithPresentFromGrace() =>
        Presence == RiderPresence.Grace
            ? this with { Presence = RiderPresence.Present }
            : this;

    public RideLiveRiderSession WithLivenessStale() =>
        this with
        {
            Liveness = PoseLiveness.Stale,
            Pose = Pose with { IsStale = true },
        };

    public RiderPoseDto ToWirePose() =>
        Pose with { IsStale = Liveness == PoseLiveness.Stale };
}
