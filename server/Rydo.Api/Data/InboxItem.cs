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

    /// <summary>When <see cref="Kind"/> is <see cref="InboxItemKind.ClubJoinRequest"/>, the club receiving the request.</summary>
    public int? ClubId { get; set; }
    public CyclingClub? Club { get; set; }

    /// <summary>User who asked to join the club (pending membership).</summary>
    public int? ClubJoinRequesterUserId { get; set; }
    public ApplicationUser? ClubJoinRequester { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? ReadAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
}
