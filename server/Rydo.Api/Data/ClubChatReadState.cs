namespace Rydo.Api.Data;

public class ClubChatReadState
{
    public int ClubId { get; set; }
    public CyclingClub? Club { get; set; }
    public int UserId { get; set; }
    public ApplicationUser? User { get; set; }
    public int? LastReadMessageId { get; set; }
}
