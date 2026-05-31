namespace Rydo.Api.Data;

/// <summary>Published timed quest or modifier instance.</summary>
public class ChallengeInstance
{
    public int Id { get; set; }
    public int? ChallengeDefinitionId { get; set; }
    public ChallengeDefinition? ChallengeDefinition { get; set; }
    public ChallengeKind Kind { get; set; }
    public ChallengeRuleType RuleType { get; set; }
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string Unit { get; set; } = "km";
    public double TargetValue { get; set; }
    public int LumpXp { get; set; } = 500;
    public int BonusPercent { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public ChallengeInstanceStatus Status { get; set; } = ChallengeInstanceStatus.Draft;
    public bool IsFeatured { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? PublishedAt { get; set; }
    public int? CreatedByAdminId { get; set; }
}
