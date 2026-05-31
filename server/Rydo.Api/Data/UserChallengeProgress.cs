namespace Rydo.Api.Data;

public class UserChallengeProgress
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public ApplicationUser? User { get; set; }
    public int ChallengeDefinitionId { get; set; }
    public ChallengeDefinition? ChallengeDefinition { get; set; }
    public int? ChallengeInstanceId { get; set; }
    public ChallengeInstance? ChallengeInstance { get; set; }
    public double CurrentValue { get; set; }
    public double TargetValue { get; set; }
    public DateTime? CompletedAt { get; set; }
}
