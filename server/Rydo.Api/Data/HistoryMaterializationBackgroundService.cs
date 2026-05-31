using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Rydo.Api.Data;

/// <summary>Hourly job to materialize ride history after event windows close.</summary>
public sealed class HistoryMaterializationBackgroundService(
    IServiceProvider services,
    ILogger<HistoryMaterializationBackgroundService> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromHours(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(TimeSpan.FromMinutes(2), stoppingToken);
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = services.CreateScope();
                var materializer = scope.ServiceProvider.GetRequiredService<Services.IHistoryMaterializationService>();
                var count = await materializer.MaterializeEligibleForAllAsync(stoppingToken);
                if (count > 0)
                    logger.LogInformation("Materialized {Count} history entries", count);
            }
            catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
            {
                logger.LogError(ex, "History materialization job failed");
            }

            await Task.Delay(Interval, stoppingToken);
        }
    }
}
