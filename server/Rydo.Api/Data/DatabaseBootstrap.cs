using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Rydo.Api.Data;

/// <summary>
/// Ensures the database schema exists before Kestrel accepts traffic. The full <see cref="DbSeeder"/> still runs
/// in <see cref="DatabaseSeederBackgroundService"/> so cold SQL Server + large seed do not block startup forever,
/// but Identity tables (e.g. AspNetUsers) must exist before any login query.
/// </summary>
public static class DatabaseBootstrap
{
    private const int MaxAttempts = 24;

    public static async Task EnsureSchemaReadyAsync(IServiceProvider services, ILogger logger, CancellationToken cancellationToken = default)
    {
        for (var attempt = 1; attempt <= MaxAttempts; attempt++)
        {
            try
            {
                using var scope = services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<RydoDbContext>();
                await db.Database.EnsureCreatedAsync(cancellationToken);
                await db.Database.ExecuteSqlRawAsync("SELECT 1", cancellationToken: cancellationToken);
                logger.LogInformation("Database schema ensured (EnsureCreated).");
                return;
            }
            catch (Exception ex)
            {
                if (attempt < MaxAttempts)
                {
                    logger.LogWarning(ex, "EnsureCreated attempt {Attempt}/{Max} failed; retrying in 5s.", attempt, MaxAttempts);
                    await Task.Delay(TimeSpan.FromSeconds(5), cancellationToken);
                    continue;
                }

                logger.LogCritical(ex, "EnsureCreated failed after {Max} attempts.", MaxAttempts);
                throw;
            }
        }
    }
}
