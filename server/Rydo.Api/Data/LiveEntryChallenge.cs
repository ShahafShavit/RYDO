namespace Rydo.Api.Data;

public class LiveEntryChallenge
{
    public int Id { get; set; }
    public string Token { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? UsedAt { get; set; }
    public string? ClientIp { get; set; }
    public int? AssignedUserId { get; set; }
    public int RideId { get; set; }
}
