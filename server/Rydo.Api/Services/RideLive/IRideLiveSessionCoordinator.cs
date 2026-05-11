namespace Rydo.Api.Services.RideLive;

public interface IRideLiveSessionCoordinator
{
    /// <summary>Starts dev bot SignalR clients for the ride (no-op if already started or not applicable).</summary>
    /// <param name="triggeringEmail">JWT email of the user who joined live; used to attach bots to this lobby for demo accounts.</param>
    void EnsureStarted(int rideId, int triggeringUserId, string? triggeringEmail);
}
