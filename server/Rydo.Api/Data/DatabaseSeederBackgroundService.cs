namespace Rydo.Api.Data;

/// <summary>
/// Runs <see cref="DbSeeder"/> after the web host has started. Schema creation runs earlier via
/// <see cref="DatabaseBootstrap.EnsureSchemaReadyAsync"/> so requests never hit an empty database before tables exist.
/// Heavy seeding can take minutes on a cold DB; keeping it here avoids blocking Kestrel startup.
/// </summary>
public sealed class DatabaseSeederBackgroundService(IServiceProvider services, ILogger<DatabaseSeederBackgroundService> logger)
    : BackgroundService
{
    private const int MaxAttempts = 24;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        for (var attempt = 1; attempt <= MaxAttempts; attempt++)
        {
            try
            {
                using var scope = services.CreateScope();
                await DbSeeder.SeedAsync(scope.ServiceProvider);
                logger.LogInformation("Database seed completed.");
                return;
            }
            catch (Exception ex)
            {
                if (attempt < MaxAttempts)
                {
                    logger.LogWarning(ex, "Database seed attempt {Attempt}/{Max} failed; retrying in 5s.", attempt, MaxAttempts);
                    await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
                    continue;
                }

                logger.LogCritical(ex, "Database seed failed after {Max} attempts.", MaxAttempts);
                throw;
            }
        }
    }
}
