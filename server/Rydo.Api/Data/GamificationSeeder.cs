using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Rydo.Api.Services;

namespace Rydo.Api.Data;

public static class GamificationSeeder
{
    public static void SeedDefinitionsAndInstances(RydoDbContext db)
    {
        if (db.ChallengeDefinitions.Any()) return;

        var now = DateTime.UtcNow;
        var boards = new[]
        {
            (LeaderboardService.BoardHorizonChasers, "Horizon Chasers", 300, 200, 100),
            (LeaderboardService.BoardSaddleJunkies, "Saddle Junkies", 300, 200, 100),
            (LeaderboardService.BoardSummitSeekers, "Summit Seekers", 300, 200, 100),
            (LeaderboardService.BoardTrailblazers, "Trailblazers", 300, 200, 100),
        };

        foreach (var (boardId, name, xp1, xp2, xp3) in boards)
        {
            for (var rank = 1; rank <= 3; rank++)
            {
                var xp = rank switch { 1 => xp1, 2 => xp2, _ => xp3 };
                db.ChallengeDefinitions.Add(new ChallengeDefinition
                {
                    Kind = ChallengeKind.Base,
                    RuleType = ChallengeRuleType.LeaderboardTop3,
                    Title = $"{name} — Top {rank}",
                    Description = $"Reach rank {rank} on the {name} leaderboard.",
                    Unit = "rank",
                    DefaultTargetValue = 1,
                    DefaultXpReward = xp,
                    LeaderboardBoardId = boardId,
                    LeaderboardRank = rank,
                    IsSystem = true,
                });
            }
        }

        var questTemplates = new[]
        {
            ("Distance Quest", "Accumulate distance on scheduled rides.", ChallengeRuleType.Distance, "km", 400.0),
            ("Elevation Quest", "Climb elevation on scheduled rides.", ChallengeRuleType.Elevation, "meters", 5000.0),
            ("Ride Count Quest", "Complete scheduled rides.", ChallengeRuleType.RideCount, "rides", 6.0),
            ("Group Rides Quest", "Join group rides with 2+ riders.", ChallengeRuleType.GroupRides, "rides", 4.0),
        };

        foreach (var (title, desc, rule, unit, target) in questTemplates)
        {
            db.ChallengeDefinitions.Add(new ChallengeDefinition
            {
                Kind = ChallengeKind.Quest,
                RuleType = rule,
                Title = title,
                Description = desc,
                Unit = unit,
                DefaultTargetValue = target,
                DefaultLumpXp = 500,
                IsSystem = true,
            });
        }

        db.ChallengeDefinitions.Add(new ChallengeDefinition
        {
            Kind = ChallengeKind.Modifier,
            RuleType = ChallengeRuleType.Distance,
            Title = "2× Weekend XP",
            Description = "Double base ride XP on weekends.",
            Unit = "percent",
            DefaultBonusPercent = 100,
            IsSystem = true,
        });

        db.ChallengeDefinitions.Add(new ChallengeDefinition
        {
            Kind = ChallengeKind.Modifier,
            RuleType = ChallengeRuleType.Distance,
            Title = "Bonus Week +50%",
            Description = "Extra ride XP during bonus week.",
            Unit = "percent",
            DefaultBonusPercent = 50,
            IsSystem = true,
        });

        db.SaveChanges();

        var defs = db.ChallengeDefinitions.ToList();
        var distDef = defs.First(d => d.Kind == ChallengeKind.Quest && d.RuleType == ChallengeRuleType.Distance);
        var elevDef = defs.First(d => d.Kind == ChallengeKind.Quest && d.RuleType == ChallengeRuleType.Elevation);
        var modDef = defs.First(d => d.Kind == ChallengeKind.Modifier && d.DefaultBonusPercent == 100);

        db.ChallengeInstances.Add(new ChallengeInstance
        {
            ChallengeDefinitionId = distDef.Id,
            Kind = ChallengeKind.Quest,
            RuleType = ChallengeRuleType.Distance,
            Title = "Coastal Distance Month",
            Description = "Ride 400 km on coastal routes this month.",
            Unit = "km",
            TargetValue = 400,
            LumpXp = 500,
            StartDate = now.AddDays(-20),
            EndDate = now.AddDays(10),
            Status = ChallengeInstanceStatus.Published,
            IsActive = true,
            IsFeatured = true,
            PublishedAt = now.AddDays(-20),
        });

        db.ChallengeInstances.Add(new ChallengeInstance
        {
            ChallengeDefinitionId = elevDef.Id,
            Kind = ChallengeKind.Quest,
            RuleType = ChallengeRuleType.Elevation,
            Title = "Spring Vertical Challenge",
            Description = "Accumulate 5,000 m elevation before summer.",
            Unit = "meters",
            TargetValue = 5000,
            LumpXp = 500,
            StartDate = now.AddMonths(-1),
            EndDate = now.AddMonths(2),
            Status = ChallengeInstanceStatus.Published,
            IsActive = true,
            PublishedAt = now.AddMonths(-1),
        });

        db.ChallengeInstances.Add(new ChallengeInstance
        {
            ChallengeDefinitionId = modDef.Id,
            Kind = ChallengeKind.Modifier,
            RuleType = ChallengeRuleType.Distance,
            Title = "2× XP this weekend",
            Description = "Double base ride XP.",
            Unit = "percent",
            TargetValue = 0,
            BonusPercent = 100,
            StartDate = now.AddDays(-1),
            EndDate = now.AddDays(2),
            Status = ChallengeInstanceStatus.Published,
            IsActive = true,
            PublishedAt = now,
        });
    }

    /// <summary>
    /// Materializes history for past scheduled rides (window closed) and awards XP via <see cref="GamificationService"/>.
    /// Solo log history rows are seeded separately and do not receive ride XP.
    /// </summary>
    public static async Task MaterializePastRidesAndGamificationAsync(
        IServiceProvider services,
        CancellationToken ct = default)
    {
        await using var scope = services.CreateAsyncScope();
        var sp = scope.ServiceProvider;
        var db = sp.GetRequiredService<RydoDbContext>();
        var materializer = sp.GetRequiredService<IHistoryMaterializationService>();
        var gamification = sp.GetRequiredService<IGamificationService>();
        var logger = sp.GetService<ILoggerFactory>()?.CreateLogger("GamificationSeeder");

        if (await db.UserGamificationProfiles.AnyAsync(ct))
            return;

        var materialized = await materializer.MaterializeEligibleForAllAsync(ct);
        logger?.LogInformation("Seed materialized {Count} scheduled ride history entries", materialized);

        var userIds = await db.HistoryEntries.AsNoTracking()
            .Select(h => h.UserId)
            .Distinct()
            .ToListAsync(ct);

        foreach (var userId in userIds)
        {
            await gamification.EnsureProfileAsync(userId, ct);
            await gamification.RecalculateQuestProgressForUserAsync(userId, ct);
            await gamification.EvaluateBaseMilestonesAsync(userId, ct);
        }
    }
}
