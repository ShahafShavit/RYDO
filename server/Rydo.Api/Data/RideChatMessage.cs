namespace Rydo.Api.Data;

public class RideChatMessage
{
    public int Id { get; set; }
    public int RideId { get; set; }
    public Ride? Ride { get; set; }
    public int AuthorUserId { get; set; }
    public ApplicationUser? Author { get; set; }
    public string Body { get; set; } = "";
    public DateTime SentAt { get; set; }
}
