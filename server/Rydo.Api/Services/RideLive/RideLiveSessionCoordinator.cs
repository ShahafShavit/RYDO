namespace Rydo.Api.Services.RideLive;

public sealed class RideLiveSessionCoordinator(
    RideLiveBotOrchestrator orchestrator,
    ILogger<RideLiveSessionCoordinator> logger)
    : IRideLiveSessionCoordinator
{
    public void EnsureStarted(int rideId, int triggeringUserId, string? triggeringEmail)
    {
        logger.LogInformation(
            "Ride live: scheduling bot orchestration for ride {RideId}, triggering user {UserId}, email {TriggerEmail}.",
            rideId,
            triggeringUserId,
            triggeringEmail ?? "(none)");
        _ = Task.Run(async () =>
        {
            try
            {
                await orchestrator.TryStartBotsForRideAsync(rideId, triggeringUserId, triggeringEmail).ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Ride live bot orchestration failed for ride {RideId}", rideId);
            }
        });
    }
}
