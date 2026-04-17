namespace Rydo.Api.Data;

public class CyclingClub
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public string? AvatarUrl { get; set; }

    /// <summary>Uploaded square club image (1:1), WebP. When set, this wins over <see cref="AvatarUrl"/> for display.</summary>
    public byte[]? AvatarImageBytes { get; set; }

    public string? AvatarImageContentType { get; set; }

    public string? Region { get; set; }
    public ClubVisibility Visibility { get; set; }
    public int CreatedByUserId { get; set; }
    public ApplicationUser? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }

    public ICollection<ClubMember> Members { get; set; } = new List<ClubMember>();
    public ICollection<ClubInvite> Invites { get; set; } = new List<ClubInvite>();
    public ICollection<Ride> Rides { get; set; } = new List<Ride>();
}
