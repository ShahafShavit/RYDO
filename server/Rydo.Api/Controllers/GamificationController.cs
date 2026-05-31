using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;
using Rydo.Api.Security;
using Rydo.Api.Services;

namespace Rydo.Api.Controllers;

[ApiController]
[Route("api/gamification")]
[Authorize]
public class GamificationController(
    RydoDbContext db,
    IGamificationService gamification,
    IHistoryMaterializationService materialization) : ControllerBase
{
    private int UserId => ClaimsUserId.FromPrincipal(User);

    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        var uid = UserId;
        await materialization.MaterializeEligibleForUserAsync(uid, ct);
        await gamification.EvaluateBaseMilestonesAsync(uid, ct);
        await gamification.RecalculateQuestProgressForUserAsync(uid, ct);

        var profile = await gamification.EnsureProfileAsync(uid, ct);
        profile = await db.UserGamificationProfiles.AsNoTracking()
            .FirstAsync(p => p.UserId == uid, ct);

        var (xpInto, xpToNext, progress) = GamificationLevelHelper.ProgressWithinLevel(profile.TotalXp, profile.Level);
        var now = DateTime.UtcNow;

        var activeEvents = await BuildActiveEventsAsync(uid, profile, now, ct);

        return Ok(new
        {
            totalXp = profile.TotalXp,
            level = profile.Level,
            lastAcknowledgedLevel = profile.LastAcknowledgedLevel,
            xpIntoLevel = xpInto,
            xpToNextLevel = xpToNext,
            levelProgressPercent = progress,
            pinnedChallengeInstanceId = profile.PinnedChallengeInstanceId,
            hasUnacknowledgedLevelUp = profile.Level > profile.LastAcknowledgedLevel,
            activeEvents,
        });
    }

    [HttpGet("me/challenges")]
    public async Task<IActionResult> MyChallenges(CancellationToken ct)
    {
        var uid = UserId;
        await materialization.MaterializeEligibleForUserAsync(uid, ct);
        await gamification.RecalculateQuestProgressForUserAsync(uid, ct);

        var quests = await db.ChallengeInstances.AsNoTracking()
            .Where(i => i.Kind == ChallengeKind.Quest
                        && i.Status == ChallengeInstanceStatus.Published
                        && i.IsActive
                        && i.EndDate >= DateTime.UtcNow.AddMonths(-1))
            .OrderBy(i => i.EndDate)
            .ToListAsync(ct);

        var modifiers = await db.ChallengeInstances.AsNoTracking()
            .Where(i => i.Kind == ChallengeKind.Modifier
                        && i.Status == ChallengeInstanceStatus.Published
                        && i.IsActive
                        && i.StartDate <= DateTime.UtcNow
                        && i.EndDate >= DateTime.UtcNow)
            .ToListAsync(ct);

        var progressRows = await db.UserChallengeProgress.AsNoTracking()
            .Where(p => p.UserId == uid)
            .ToListAsync(ct);

        var achievements = await db.UserChallengeProgress
            .AsNoTracking()
            .Include(p => p.ChallengeDefinition)
            .Include(p => p.ChallengeInstance)
            .Where(p => p.UserId == uid && p.CompletedAt != null)
            .OrderByDescending(p => p.CompletedAt)
            .Take(50)
            .ToListAsync(ct);

        return Ok(new
        {
            quests = quests.Select(i => MapInstance(i, progressRows.FirstOrDefault(p => p.ChallengeInstanceId == i.Id))).ToList(),
            modifiers = modifiers.Select(MapModifier).ToList(),
            achievements = achievements.Select(MapAchievement).ToList(),
        });
    }

    [HttpGet("xp-recent")]
    public async Task<IActionResult> RecentXp([FromQuery] int take = 20, CancellationToken ct = default)
    {
        take = Math.Clamp(take, 1, 50);
        var items = await db.XpLedgerEntries.AsNoTracking()
            .Where(x => x.UserId == UserId)
            .OrderByDescending(x => x.CreatedAt)
            .Take(take)
            .Select(x => new
            {
                id = x.Id,
                amount = x.Amount,
                sourceType = x.SourceType,
                description = x.Description,
                createdAt = x.CreatedAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
            })
            .ToListAsync(ct);
        return Ok(new { items });
    }

    [HttpPut("me/pinned-challenge")]
    public async Task<IActionResult> SetPinned([FromBody] PinChallengeRequest body, CancellationToken ct)
    {
        var profile = await gamification.EnsureProfileAsync(UserId, ct);
        if (body.InstanceId == null)
        {
            profile.PinnedChallengeInstanceId = null;
            await db.SaveChangesAsync(ct);
            return Ok(new { pinnedChallengeInstanceId = (int?)null });
        }

        var inst = await db.ChallengeInstances.AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == body.InstanceId
                                      && i.Status == ChallengeInstanceStatus.Published
                                      && i.IsActive, ct);
        if (inst == null) return NotFound();

        profile.PinnedChallengeInstanceId = inst.Id;
        await db.SaveChangesAsync(ct);
        return Ok(new { pinnedChallengeInstanceId = inst.Id });
    }

    [HttpPatch("me/acknowledge-level")]
    public async Task<IActionResult> AcknowledgeLevel(CancellationToken ct)
    {
        var profile = await db.UserGamificationProfiles.FirstOrDefaultAsync(p => p.UserId == UserId, ct);
        if (profile == null) return NotFound();
        profile.LastAcknowledgedLevel = profile.Level;
        await db.SaveChangesAsync(ct);
        return Ok(new { lastAcknowledgedLevel = profile.LastAcknowledgedLevel });
    }

    private async Task<object> BuildActiveEventsAsync(
        int uid,
        UserGamificationProfile profile,
        DateTime now,
        CancellationToken ct)
    {
        var progressRows = await db.UserChallengeProgress.AsNoTracking()
            .Where(p => p.UserId == uid)
            .ToListAsync(ct);

        var featured = await db.ChallengeInstances.AsNoTracking()
            .FirstOrDefaultAsync(i => i.IsFeatured
                                      && i.Status == ChallengeInstanceStatus.Published
                                      && i.IsActive
                                      && i.StartDate <= now
                                      && i.EndDate >= now, ct);

        ChallengeInstance? pinned = null;
        if (profile.PinnedChallengeInstanceId is int pinId)
        {
            pinned = await db.ChallengeInstances.AsNoTracking()
                .FirstOrDefaultAsync(i => i.Id == pinId
                                          && i.Status == ChallengeInstanceStatus.Published
                                          && i.IsActive
                                          && i.EndDate >= now, ct);
        }

        var modifiers = await db.ChallengeInstances.AsNoTracking()
            .Where(i => i.Kind == ChallengeKind.Modifier
                        && i.Status == ChallengeInstanceStatus.Published
                        && i.IsActive
                        && i.StartDate <= now
                        && i.EndDate >= now)
            .ToListAsync(ct);

        var quests = await db.ChallengeInstances.AsNoTracking()
            .Where(i => i.Kind == ChallengeKind.Quest
                        && i.Status == ChallengeInstanceStatus.Published
                        && i.IsActive
                        && i.EndDate >= now)
            .OrderBy(i => i.EndDate)
            .ToListAsync(ct);

        var defaultCard = pinned ?? featured;
        if (defaultCard == null && modifiers.Count > 0)
            defaultCard = modifiers[0];
        else if (defaultCard == null && quests.Count > 0)
            defaultCard = quests[0];

        return new
        {
            featured = featured == null ? null : MapInstance(featured, progressRows.FirstOrDefault(p => p.ChallengeInstanceId == featured.Id)),
            pinned = pinned == null ? null : (pinned.Kind == ChallengeKind.Modifier ? MapModifier(pinned) : MapInstance(pinned, progressRows.FirstOrDefault(p => p.ChallengeInstanceId == pinned.Id))),
            defaultFeaturedCard = defaultCard == null
                ? null
                : (defaultCard.Kind == ChallengeKind.Modifier
                    ? MapModifier(defaultCard)
                    : MapInstance(defaultCard, progressRows.FirstOrDefault(p => p.ChallengeInstanceId == defaultCard.Id))),
            greeting = featured != null
                ? MapInstance(featured, progressRows.FirstOrDefault(p => p.ChallengeInstanceId == featured.Id))
                : modifiers.Count > 0
                    ? MapModifier(modifiers[0])
                    : quests.Count > 0
                        ? MapInstance(quests[0], progressRows.FirstOrDefault(p => p.ChallengeInstanceId == quests[0].Id))
                        : null,
        };
    }

    private static object MapModifier(ChallengeInstance i) => new
    {
        id = i.Id,
        kind = "modifier",
        title = i.Title,
        description = i.Description,
        bonusPercent = i.BonusPercent,
        startDate = i.StartDate.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
        endDate = i.EndDate.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
        isFeatured = i.IsFeatured,
    };

    private static object MapInstance(ChallengeInstance i, UserChallengeProgress? progress) => new
    {
        id = i.Id,
        kind = "quest",
        title = i.Title,
        description = i.Description,
        targetValue = i.TargetValue,
        currentValue = progress?.CurrentValue ?? 0,
        unit = i.Unit,
        ruleType = i.RuleType.ToString(),
        lumpXp = i.LumpXp,
        startDate = i.StartDate.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
        endDate = i.EndDate.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
        isFeatured = i.IsFeatured,
        completedAt = progress?.CompletedAt?.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
        progressPercent = i.TargetValue <= 0
            ? 0
            : Math.Min(100, Math.Round((progress?.CurrentValue ?? 0) * 100 / i.TargetValue, 1)),
    };

    private static object MapAchievement(UserChallengeProgress p)
    {
        var title = p.ChallengeInstance?.Title ?? p.ChallengeDefinition?.Title ?? "Achievement";
        return new
        {
            id = p.Id,
            title,
            completedAt = p.CompletedAt!.Value.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
            kind = p.ChallengeDefinition?.Kind.ToString() ?? "quest",
        };
    }
}

public class PinChallengeRequest
{
    public int? InstanceId { get; set; }
}
