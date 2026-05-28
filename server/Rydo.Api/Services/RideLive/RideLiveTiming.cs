namespace Rydo.Api.Services.RideLive;

/// <summary>Shared live-ride timing contract (must match client rideLiveTiming.js).</summary>
public static class RideLiveTiming
{
    public const int PoseHeartbeatIntervalMs = 2000;
    public const int PoseStaleSeconds = 10;
    public const int DisconnectGraceSeconds = 45;
}
