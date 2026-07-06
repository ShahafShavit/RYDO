using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;
using Rydo.Api.Services.Hazards;

namespace Rydo.Api.Services;

public class HazardExpiryBackgroundService(IServiceScopeFactory scopeFactory, ILogger<HazardExpiryBackgroundService> logger)
    : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromHours(24);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ExpireOldHazardsAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogWarning(ex, "Hazard expiry job failed");
            }

            await Task.Delay(Interval, stoppingToken);
        }
    }

    private async Task ExpireOldHazardsAsync(CancellationToken ct)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<RydoDbContext>();
        var cutoff = HazardVisibility.ExpiryCutoffUtc();

        var expired = await db.Hazards
            .Where(h => h.Status == HazardConstants.StatusActive && h.ReportedAt < cutoff)
            .ToListAsync(ct);

        if (expired.Count == 0)
            return;

        foreach (var h in expired)
            h.Status = HazardConstants.StatusHidden;

        await db.SaveChangesAsync(ct);
        logger.LogInformation("Soft-hidden {Count} expired hazards", expired.Count);
    }
}
