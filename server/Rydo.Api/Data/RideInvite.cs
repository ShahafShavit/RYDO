namespace Rydo.Api.Data;

public class RideInvite
{
    public int Id { get; set; }
    public int RideId { get; set; }
    public Ride? Ride { get; set; }
    public int FromUserId { get; set; }
    public ApplicationUser? FromUser { get; set; }
    public int ToUserId { get; set; }
    public ApplicationUser? ToUser { get; set; }
    public RideInviteStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? RespondedAt { get; set; }
}
