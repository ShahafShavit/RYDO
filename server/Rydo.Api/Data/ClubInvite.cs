namespace Rydo.Api.Data;

public class ClubInvite
{
    public int Id { get; set; }
    public int ClubId { get; set; }
    public CyclingClub? Club { get; set; }
    /// <summary>Opaque token string (unique). Client sends this to redeem.</summary>
    public string Token { get; set; } = "";
    public int CreatedByUserId { get; set; }
    public ApplicationUser? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public int MaxUses { get; set; } = 1;
    public int UsedCount { get; set; }
    public DateTime? RevokedAt { get; set; }
}
