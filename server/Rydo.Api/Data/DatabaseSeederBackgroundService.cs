using Microsoft.EntityFrameworkCore;

namespace Rydo.Api.Data;

/// <summary>
/// Runs <see cref="EnsureCreated"/> + <see cref="DbSeeder"/> after the web host has started listening.
/// Doing this in <c>Program.cs</c> before <c>app.Run()</c> blocks Kestrel until seeding completes (minutes on a cold DB),
/// which causes connection resets / empty replies and frontend NetworkError while developing against Docker.
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
                var db = scope.ServiceProvider.GetRequiredService<RydoDbContext>();
                await db.Database.EnsureCreatedAsync(stoppingToken);
                await db.Database.ExecuteSqlRawAsync("SELECT 1", cancellationToken: stoppingToken);
                await DbSeeder.SeedAsync(scope.ServiceProvider);
                logger.LogInformation("Database created/verified and seed completed.");
                return;
            }
            catch (Exception ex)
            {
                if (attempt < MaxAttempts)
                {
                    logger.LogWarning(ex, "Database init/seed attempt {Attempt}/{Max} failed; retrying in 5s.", attempt, MaxAttempts);
                    await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
                    continue;
                }

                logger.LogCritical(ex, "Database init/seed failed after {Max} attempts.", MaxAttempts);
                throw;
            }
        }
    }
}
