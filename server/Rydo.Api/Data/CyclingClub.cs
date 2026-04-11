namespace Rydo.Api.Data;

public class CyclingClub
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public string? Region { get; set; }
    public ClubVisibility Visibility { get; set; }
    public int CreatedByUserId { get; set; }
    public ApplicationUser? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }

    public ICollection<ClubMember> Members { get; set; } = new List<ClubMember>();
    public ICollection<ClubInvite> Invites { get; set; } = new List<ClubInvite>();
    public ICollection<RideGroup> RideGroups { get; set; } = new List<RideGroup>();
}
