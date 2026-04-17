namespace Rydo.Api.Data;

public class FriendRequest
{
    public int Id { get; set; }
    public int FromUserId { get; set; }
    public ApplicationUser? FromUser { get; set; }
    public int ToUserId { get; set; }
    public ApplicationUser? ToUser { get; set; }
    public FriendRequestStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? RespondedAt { get; set; }
}
