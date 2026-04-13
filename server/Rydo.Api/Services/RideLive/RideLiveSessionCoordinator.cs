namespace Rydo.Api.Services.RideLive;

public sealed class RideLiveSessionCoordinator(
    RideLiveBotOrchestrator orchestrator,
    ILogger<RideLiveSessionCoordinator> logger)
    : IRideLiveSessionCoordinator
{
    public void EnsureStarted(int rideId, int triggeringUserId, string? triggeringEmail)
    {
        logger.LogInformation(
            "Ride live: scheduling simulator orchestration for ride {RideId}, joiner user {UserId}, email {JoinerEmail}.",
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
                logger.LogError(ex, "Ride live simulator orchestration failed for ride {RideId}", rideId);
            }
        });
    }
}
