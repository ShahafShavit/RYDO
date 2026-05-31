using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;

namespace Rydo.Api.Services;

public interface IGamificationService
{
    Task OnHistoryMaterializedAsync(HistoryEntry entry, int participantCount, bool isClubRide, CancellationToken ct = default);
    Task EvaluateBaseMilestonesAsync(int userId, CancellationToken ct = default);
    Task<UserGamificationProfile> EnsureProfileAsync(int userId, CancellationToken ct = default);
    Task RecalculateQuestProgressForUserAsync(int userId, CancellationToken ct = default);
}

public sealed class GamificationService(RydoDbContext db, ILeaderboardService leaderboards) : IGamificationService
{
    public async Task<UserGamificationProfile> EnsureProfileAsync(int userId, CancellationToken ct = default)
    {
        var profile = await db.UserGamificationProfiles.FirstOrDefaultAsync(p => p.UserId == userId, ct);
        if (profile != null) return profile;
        profile = new UserGamificationProfile { UserId = userId, Level = 1, LastAcknowledgedLevel = 1 };
        db.UserGamificationProfiles.Add(profile);
        await db.SaveChangesAsync(ct);
        return profile;
    }

    public async Task OnHistoryMaterializedAsync(
        HistoryEntry entry,
        int participantCount,
        bool isClubRide,
        CancellationToken ct = default)
    {
        var route = await db.Routes.AsNoTracking().FirstOrDefaultAsync(r => r.Id == entry.RouteId, ct);
        var distKm = HistoryMergeHelper.EffectiveDistanceKm(entry, route);
        var elevM = HistoryMergeHelper.EffectiveElevationGainM(entry, route);

        var baseXp = 10 + (int)Math.Round(distKm * 2) + (int)Math.Round(elevM / 100);
        if (isClubRide) baseXp = (int)Math.Round(baseXp * 1.25);
        if (participantCount >= 2) baseXp = (int)Math.Round(baseXp * 1.15);

        var now = DateTime.UtcNow;
        var modifierBonus = await db.ChallengeInstances.AsNoTracking()
            .Where(i => i.Kind == ChallengeKind.Modifier
                        && i.Status == ChallengeInstanceStatus.Published
                        && i.IsActive
                        && i.StartDate <= now
                        && i.EndDate >= now)
            .SumAsync(i => i.BonusPercent, ct);

        if (modifierBonus > 0)
            baseXp = (int)Math.Round(baseXp * (1 + modifierBonus / 100.0));

        await AwardXpAsync(entry.UserId, baseXp, XpSourceType.HistoryRide, entry.Id,
            $"Ride: {entry.RouteTitle}", ct);

        await RecalculateQuestProgressForUserAsync(entry.UserId, ct);
        await EvaluateBaseMilestonesAsync(entry.UserId, ct);
    }

    public async Task RecalculateQuestProgressForUserAsync(int userId, CancellationToken ct = default)
    {
        var instances = await db.ChallengeInstances.AsNoTracking()
            .Where(i => i.Kind == ChallengeKind.Quest
                        && i.Status == ChallengeInstanceStatus.Published
                        && i.IsActive)
            .ToListAsync(ct);

        foreach (var inst in instances)
        {
            var progress = await db.UserChallengeProgress
                .FirstOrDefaultAsync(p => p.UserId == userId && p.ChallengeInstanceId == inst.Id, ct);
            if (progress?.CompletedAt != null) continue;

            var defId = inst.ChallengeDefinitionId ?? 0;
            if (defId == 0) continue;

            if (progress == null)
            {
                progress = new UserChallengeProgress
                {
                    UserId = userId,
                    ChallengeDefinitionId = defId,
                    ChallengeInstanceId = inst.Id,
                    TargetValue = inst.TargetValue,
                };
                db.UserChallengeProgress.Add(progress);
            }

            progress.CurrentValue = await ComputeQuestProgressAsync(userId, inst, ct);
            progress.TargetValue = inst.TargetValue;

            if (progress.CurrentValue >= inst.TargetValue && progress.CompletedAt == null)
            {
                progress.CompletedAt = DateTime.UtcNow;
                await AwardXpAsync(userId, inst.LumpXp, XpSourceType.QuestComplete, inst.Id,
                    $"Quest complete: {inst.Title}", ct);
                db.InboxItems.Add(new InboxItem
                {
                    RecipientUserId = userId,
                    Kind = InboxItemKind.QuestComplete,
                    ChallengeInstanceId = inst.Id,
                    CreatedAt = DateTime.UtcNow,
                });
            }
        }

        await db.SaveChangesAsync(ct);
    }

    private async Task<double> ComputeQuestProgressAsync(int userId, ChallengeInstance inst, CancellationToken ct)
    {
        var history = await db.HistoryEntries.AsNoTracking()
            .Include(h => h.Route)
            .Include(h => h.Ride)
            .Where(h => h.UserId == userId
                        && h.CompletedAt >= inst.StartDate
                        && h.CompletedAt <= inst.EndDate)
            .ToListAsync(ct);

        return inst.RuleType switch
        {
            ChallengeRuleType.Distance => history.Sum(h => HistoryMergeHelper.EffectiveDistanceKm(h, h.Route)),
            ChallengeRuleType.Elevation => history.Sum(h => HistoryMergeHelper.EffectiveElevationGainM(h, h.Route)),
            ChallengeRuleType.RideCount => history.Count,
            ChallengeRuleType.GroupRides => await CountGroupRidesInHistoryAsync(history, ct),
            _ => 0,
        };
    }

    private async Task<double> CountGroupRidesInHistoryAsync(List<HistoryEntry> history, CancellationToken ct)
    {
        var count = 0;
        foreach (var h in history)
        {
            var n = await db.RideParticipants.CountAsync(p => p.RideId == h.RideId, ct);
            if (n >= 2) count++;
        }
        return count;
    }

    public async Task EvaluateBaseMilestonesAsync(int userId, CancellationToken ct = default)
    {
        var badges = await leaderboards.GetUserTopThreeBadgesAsync(userId, ct);
        if (badges.Count == 0) return;

        var baseDefs = await db.ChallengeDefinitions.AsNoTracking()
            .Where(d => d.Kind == ChallengeKind.Base && d.IsSystem)
            .ToListAsync(ct);

        foreach (var badge in badges)
        {
            var def = baseDefs.FirstOrDefault(d =>
                d.LeaderboardBoardId == badge.BoardId && d.LeaderboardRank == badge.Rank);
            if (def == null) continue;

            var existing = await db.UserChallengeProgress
                .AnyAsync(p => p.UserId == userId
                               && p.ChallengeDefinitionId == def.Id
                               && p.ChallengeInstanceId == null
                               && p.CompletedAt != null, ct);
            if (existing) continue;

            var progress = await db.UserChallengeProgress
                .FirstOrDefaultAsync(p => p.UserId == userId
                                          && p.ChallengeDefinitionId == def.Id
                                          && p.ChallengeInstanceId == null, ct);
            if (progress == null)
            {
                progress = new UserChallengeProgress
                {
                    UserId = userId,
                    ChallengeDefinitionId = def.Id,
                    TargetValue = 1,
                    CurrentValue = 1,
                    CompletedAt = DateTime.UtcNow,
                };
                db.UserChallengeProgress.Add(progress);
            }
            else
            {
                progress.CurrentValue = 1;
                progress.CompletedAt = DateTime.UtcNow;
            }

            await AwardXpAsync(userId, def.DefaultXpReward, XpSourceType.BaseMilestone, def.Id,
                $"Top {badge.Rank} on {badge.BoardId}", ct);
        }

        await db.SaveChangesAsync(ct);
    }

    private async Task AwardXpAsync(
        int userId,
        int amount,
        string sourceType,
        int sourceId,
        string description,
        CancellationToken ct)
    {
        if (amount <= 0) return;

        var exists = await db.XpLedgerEntries.AnyAsync(
            x => x.UserId == userId && x.SourceType == sourceType && x.SourceId == sourceId, ct);
        if (exists) return;

        var profile = await EnsureProfileAsync(userId, ct);
        var oldLevel = profile.Level;

        db.XpLedgerEntries.Add(new XpLedgerEntry
        {
            UserId = userId,
            Amount = amount,
            SourceType = sourceType,
            SourceId = sourceId,
            Description = description,
            CreatedAt = DateTime.UtcNow,
        });

        profile.TotalXp += amount;
        profile.Level = GamificationLevelHelper.LevelFromTotalXp(profile.TotalXp);

        if (profile.Level > oldLevel)
        {
            db.InboxItems.Add(new InboxItem
            {
                RecipientUserId = userId,
                Kind = InboxItemKind.LevelUp,
                GamificationLevel = profile.Level,
                CreatedAt = DateTime.UtcNow,
            });
        }

        await db.SaveChangesAsync(ct);
    }
}
