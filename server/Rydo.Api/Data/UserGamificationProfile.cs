namespace Rydo.Api.Data;

public class UserGamificationProfile
{
    public int UserId { get; set; }
    public ApplicationUser? User { get; set; }
    public int TotalXp { get; set; }
    public int Level { get; set; } = 1;
    public int LastAcknowledgedLevel { get; set; } = 1;
    public int? PinnedChallengeInstanceId { get; set; }
    public ChallengeInstance? PinnedChallengeInstance { get; set; }
}
