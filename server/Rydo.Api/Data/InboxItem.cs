namespace Rydo.Api.Data;

public class InboxItem
{
    public int Id { get; set; }
    public int RecipientUserId { get; set; }
    public ApplicationUser? Recipient { get; set; }

    /// <summary>See <see cref="InboxItemKind"/>.</summary>
    public string Kind { get; set; } = "";

    public int? FriendRequestId { get; set; }
    public FriendRequest? FriendRequest { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? ReadAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
}
