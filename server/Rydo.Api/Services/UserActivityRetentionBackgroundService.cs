using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Rydo.Api.Data;

namespace Rydo.Api.Services;

/// <summary>Deletes user activity rollups older than 90 UTC days.</summary>
public sealed class UserActivityRetentionBackgroundService(
    IServiceProvider services,
    ILogger<UserActivityRetentionBackgroundService> logger) : BackgroundService
{
    private const int RetentionDays = 90;
    private static readonly TimeSpan Interval = TimeSpan.FromHours(24);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await PurgeAsync(stoppingToken);
            }
            catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
            {
                logger.LogError(ex, "User activity retention purge failed");
            }

            await Task.Delay(Interval, stoppingToken);
        }
    }

    private async Task PurgeAsync(CancellationToken ct)
    {
        var cutoff = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-RetentionDays);

        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RydoDbContext>();

        var hoursDeleted = await db.UserActivityHours
            .Where(h => h.ActivityDateUtc < cutoff)
            .ExecuteDeleteAsync(ct);

        var daysDeleted = await db.UserActivityDays
            .Where(d => d.ActivityDateUtc < cutoff)
            .ExecuteDeleteAsync(ct);

        if (hoursDeleted > 0 || daysDeleted > 0)
        {
            logger.LogInformation(
                "Purged user activity older than {Cutoff}: {DaysDeleted} day rows, {HoursDeleted} hour rows",
                cutoff,
                daysDeleted,
                hoursDeleted);
        }
    }
}
