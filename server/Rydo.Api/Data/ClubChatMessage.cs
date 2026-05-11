namespace Rydo.Api.Data;

public class ClubChatMessage
{
    public int Id { get; set; }
    public int ClubId { get; set; }
    public CyclingClub? Club { get; set; }
    public int AuthorUserId { get; set; }
    public ApplicationUser? Author { get; set; }
    public string Body { get; set; } = "";
    /// <summary>JSON array of { "kind": "user"|"route"|"ride", "id": number }.</summary>
    public string? MentionsJson { get; set; }
    public DateTime SentAt { get; set; }
}
