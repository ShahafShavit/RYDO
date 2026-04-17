namespace Rydo.Api.Data;

/// <summary>Discriminator for <see cref="InboxItem"/>; extend for future notification types.</summary>
public static class InboxItemKind
{
    public const string FriendRequest = "friend_request";
    public const string ClubJoinRequest = "club_join_request";
}
