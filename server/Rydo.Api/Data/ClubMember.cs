namespace Rydo.Api.Data;

public class ClubMember
{
    public int ClubId { get; set; }
    public CyclingClub? Club { get; set; }
    public int UserId { get; set; }
    public ApplicationUser? User { get; set; }
    public ClubMemberRole Role { get; set; }
    public ClubMembershipStatus MembershipStatus { get; set; }
    public DateTime RequestedAt { get; set; }
    public DateTime? ActivatedAt { get; set; }
}
