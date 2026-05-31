namespace Rydo.Api.Data;

/// <summary>Reusable challenge template (quest, modifier, or base milestone).</summary>
public class ChallengeDefinition
{
    public int Id { get; set; }
    public ChallengeKind Kind { get; set; }
    public ChallengeRuleType RuleType { get; set; }
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string Unit { get; set; } = "km";
    public double DefaultTargetValue { get; set; }
    public int DefaultLumpXp { get; set; } = 500;
    public int DefaultBonusPercent { get; set; }
    /// <summary>For base leaderboard milestones (horizonChasers, etc.).</summary>
    public string? LeaderboardBoardId { get; set; }
    /// <summary>For base milestones: 1, 2, or 3.</summary>
    public int? LeaderboardRank { get; set; }
    public int DefaultXpReward { get; set; } = 100;
    public bool IsSystem { get; set; }
}
