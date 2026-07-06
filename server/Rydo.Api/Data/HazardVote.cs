namespace Rydo.Api.Data;

public class HazardVote
{
    public int HazardId { get; set; }
    public HazardEntity? Hazard { get; set; }
    public int UserId { get; set; }
    public ApplicationUser? User { get; set; }
    /// <summary>+1 upvote or -1 downvote.</summary>
    public int Value { get; set; }
    public DateTime UpdatedAt { get; set; }
}
