namespace Rydo.Api.Data;

public class RideChatReadState
{
    public int RideId { get; set; }
    public Ride? Ride { get; set; }
    public int UserId { get; set; }
    public ApplicationUser? User { get; set; }
    public int? LastReadMessageId { get; set; }
}
