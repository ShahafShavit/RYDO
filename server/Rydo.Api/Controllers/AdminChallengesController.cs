using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;

namespace Rydo.Api.Controllers;

[ApiController]
[Route("api/admin/challenges")]
[Authorize(Roles = "admin")]
public class AdminChallengesController(RydoDbContext db) : ControllerBase
{
    private int AdminId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");

    [HttpGet("templates")]
    public async Task<IActionResult> Templates(CancellationToken ct)
    {
        var items = await db.ChallengeDefinitions.AsNoTracking().OrderBy(d => d.Kind).ThenBy(d => d.Id).ToListAsync(ct);
        return Ok(new { items = items.Select(MapDefinition) });
    }

    [HttpGet("instances")]
    public async Task<IActionResult> Instances(
        [FromQuery] int skip = 0,
        [FromQuery] int take = 50,
        [FromQuery] string? status = null,
        CancellationToken ct = default)
    {
        take = Math.Clamp(take, 1, 100);
        var q = db.ChallengeInstances.AsNoTracking().OrderByDescending(i => i.StartDate);
        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<ChallengeInstanceStatus>(status, true, out var st))
            q = (IOrderedQueryable<ChallengeInstance>)q.Where(i => i.Status == st);

        var total = await q.CountAsync(ct);
        var rows = await q.Skip(skip).Take(take).ToListAsync(ct);
        var completionCounts = await db.UserChallengeProgress.AsNoTracking()
            .Where(p => p.CompletedAt != null && p.ChallengeInstanceId != null)
            .GroupBy(p => p.ChallengeInstanceId)
            .Select(g => new { InstanceId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.InstanceId!.Value, x => x.Count, ct);

        return Ok(new
        {
            items = rows.Select(i => MapInstanceAdmin(i, completionCounts.GetValueOrDefault(i.Id))),
            total,
            skip,
            take,
        });
    }

    [HttpGet("instances/{id:int}/progress")]
    public async Task<IActionResult> InstanceProgress(int id, [FromQuery] int skip = 0, [FromQuery] int take = 50, CancellationToken ct = default)
    {
        take = Math.Clamp(take, 1, 100);
        var q = db.UserChallengeProgress.AsNoTracking()
            .Include(p => p.User)
            .Where(p => p.ChallengeInstanceId == id)
            .OrderByDescending(p => p.CurrentValue);

        var total = await q.CountAsync(ct);
        var rows = await q.Skip(skip).Take(take).ToListAsync(ct);
        return Ok(new
        {
            items = rows.Select(p => new
            {
                userId = p.UserId,
                handle = p.User?.Handle,
                displayName = p.User != null ? $"{p.User.FirstName} {p.User.LastName}".Trim() : null,
                currentValue = p.CurrentValue,
                targetValue = p.TargetValue,
                progressPercent = p.TargetValue <= 0 ? 0 : Math.Min(100, Math.Round(p.CurrentValue * 100 / p.TargetValue, 1)),
                completedAt = p.CompletedAt?.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
            }),
            total,
            skip,
            take,
        });
    }

    [HttpPost("instances")]
    public async Task<IActionResult> CreateInstance([FromBody] AdminChallengeInstanceRequest body, CancellationToken ct)
    {
        var inst = MapRequestToInstance(body, AdminId);
        if (body.Publish)
        {
            inst.Status = ChallengeInstanceStatus.Published;
            inst.PublishedAt = DateTime.UtcNow;
            if (body.IsFeatured)
                await ClearFeaturedAsync(ct);
        }

        db.ChallengeInstances.Add(inst);
        await db.SaveChangesAsync(ct);
        return Ok(MapInstanceAdmin(inst, 0));
    }

    [HttpPatch("instances/{id:int}")]
    public async Task<IActionResult> PatchInstance(int id, [FromBody] AdminChallengeInstancePatch body, CancellationToken ct)
    {
        var inst = await db.ChallengeInstances.FirstOrDefaultAsync(i => i.Id == id, ct);
        if (inst == null) return NotFound();

        if (body.IsActive.HasValue) inst.IsActive = body.IsActive.Value;
        if (body.StartDate.HasValue) inst.StartDate = body.StartDate.Value.ToUniversalTime();
        if (body.EndDate.HasValue) inst.EndDate = body.EndDate.Value.ToUniversalTime();
        if (body.EndEarly == true)
        {
            var local = DateTime.Now.Date.AddDays(1).AddTicks(-1);
            inst.EndDate = local.ToUniversalTime();
        }
        if (body.IsFeatured == true)
        {
            await ClearFeaturedAsync(ct);
            inst.IsFeatured = true;
        }
        if (body.Publish == true && inst.Status == ChallengeInstanceStatus.Draft)
        {
            inst.Status = ChallengeInstanceStatus.Published;
            inst.PublishedAt = DateTime.UtcNow;
        }
        if (body.Title != null) inst.Title = body.Title;
        if (body.Description != null) inst.Description = body.Description;
        if (body.TargetValue.HasValue) inst.TargetValue = body.TargetValue.Value;
        if (body.LumpXp.HasValue) inst.LumpXp = body.LumpXp.Value;
        if (body.BonusPercent.HasValue) inst.BonusPercent = body.BonusPercent.Value;

        await db.SaveChangesAsync(ct);
        return Ok(MapInstanceAdmin(inst, 0));
    }

    [HttpPatch("templates/{id:int}")]
    public async Task<IActionResult> PatchTemplate(int id, [FromBody] AdminChallengeTemplatePatch body, CancellationToken ct)
    {
        var def = await db.ChallengeDefinitions.FirstOrDefaultAsync(d => d.Id == id, ct);
        if (def == null) return NotFound();
        if (body.DefaultTargetValue.HasValue) def.DefaultTargetValue = body.DefaultTargetValue.Value;
        if (body.DefaultLumpXp.HasValue) def.DefaultLumpXp = body.DefaultLumpXp.Value;
        if (body.DefaultBonusPercent.HasValue) def.DefaultBonusPercent = body.DefaultBonusPercent.Value;
        if (body.DefaultXpReward.HasValue) def.DefaultXpReward = body.DefaultXpReward.Value;
        if (body.Title != null) def.Title = body.Title;
        if (body.Description != null) def.Description = body.Description;
        await db.SaveChangesAsync(ct);
        return Ok(MapDefinition(def));
    }

    [HttpDelete("instances/{id:int}")]
    public async Task<IActionResult> DeleteInstance(int id, CancellationToken ct)
    {
        var inst = await db.ChallengeInstances.FirstOrDefaultAsync(i => i.Id == id, ct);
        if (inst == null) return NotFound();
        if (inst.Status != ChallengeInstanceStatus.Draft && inst.PublishedAt != null)
            return Problem(statusCode: 400, detail: "Only drafts or never-published instances can be deleted.");
        db.ChallengeInstances.Remove(inst);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private async Task ClearFeaturedAsync(CancellationToken ct)
    {
        await db.ChallengeInstances
            .Where(i => i.IsFeatured)
            .ExecuteUpdateAsync(s => s.SetProperty(i => i.IsFeatured, false), ct);
    }

    private static ChallengeInstance MapRequestToInstance(AdminChallengeInstanceRequest body, int adminId)
    {
        var kind = body.Kind?.ToLowerInvariant() == "modifier" ? ChallengeKind.Modifier : ChallengeKind.Quest;
        Enum.TryParse<ChallengeRuleType>(body.RuleType ?? "Distance", true, out var rule);
        return new ChallengeInstance
        {
            ChallengeDefinitionId = body.TemplateId,
            Kind = kind,
            RuleType = rule,
            Title = body.Title ?? "",
            Description = body.Description ?? "",
            Unit = body.Unit ?? "km",
            TargetValue = body.TargetValue ?? 0,
            LumpXp = body.LumpXp ?? 500,
            BonusPercent = body.BonusPercent ?? 0,
            StartDate = (body.StartDate ?? DateTime.UtcNow).ToUniversalTime(),
            EndDate = (body.EndDate ?? DateTime.UtcNow.AddDays(30)).ToUniversalTime(),
            Status = body.Publish ? ChallengeInstanceStatus.Published : ChallengeInstanceStatus.Draft,
            IsActive = true,
            IsFeatured = body.IsFeatured,
            CreatedByAdminId = adminId,
            PublishedAt = body.Publish ? DateTime.UtcNow : null,
        };
    }

    private static object MapDefinition(ChallengeDefinition d) => new
    {
        id = d.Id,
        kind = d.Kind.ToString(),
        ruleType = d.RuleType.ToString(),
        title = d.Title,
        description = d.Description,
        unit = d.Unit,
        defaultTargetValue = d.DefaultTargetValue,
        defaultLumpXp = d.DefaultLumpXp,
        defaultBonusPercent = d.DefaultBonusPercent,
        defaultXpReward = d.DefaultXpReward,
        leaderboardBoardId = d.LeaderboardBoardId,
        leaderboardRank = d.LeaderboardRank,
        isSystem = d.IsSystem,
    };

    private static object MapInstanceAdmin(ChallengeInstance i, int completionCount) => new
    {
        id = i.Id,
        templateId = i.ChallengeDefinitionId,
        kind = i.Kind.ToString(),
        ruleType = i.RuleType.ToString(),
        title = i.Title,
        description = i.Description,
        unit = i.Unit,
        targetValue = i.TargetValue,
        lumpXp = i.LumpXp,
        bonusPercent = i.BonusPercent,
        startDate = i.StartDate.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
        endDate = i.EndDate.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
        status = i.Status.ToString(),
        isActive = i.IsActive,
        isFeatured = i.IsFeatured,
        completionCount,
    };
}

public class AdminChallengeInstanceRequest
{
    public int? TemplateId { get; set; }
    public string? Kind { get; set; }
    public string? RuleType { get; set; }
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Unit { get; set; }
    public double? TargetValue { get; set; }
    public int? LumpXp { get; set; }
    public int? BonusPercent { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public bool Publish { get; set; }
    public bool IsFeatured { get; set; }
}

public class AdminChallengeInstancePatch
{
    public bool? IsActive { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public bool? EndEarly { get; set; }
    public bool? IsFeatured { get; set; }
    public bool? Publish { get; set; }
    public string? Title { get; set; }
    public string? Description { get; set; }
    public double? TargetValue { get; set; }
    public int? LumpXp { get; set; }
    public int? BonusPercent { get; set; }
}

public class AdminChallengeTemplatePatch
{
    public double? DefaultTargetValue { get; set; }
    public int? DefaultLumpXp { get; set; }
    public int? DefaultBonusPercent { get; set; }
    public int? DefaultXpReward { get; set; }
    public string? Title { get; set; }
    public string? Description { get; set; }
}
