namespace Rydo.Api.Data;

/// <summary>Deterministic ride-invite / club-ride announcement demo for <c>user@rydo.test</c> (John Rider).</summary>
public sealed class RideInboxSeedSpec
{
    /// <summary>Community index for John's befriended rider (see <see cref="FriendInboxSeedSpec.DemoRiderBefriendsCommunityIndex"/>).</summary>
    public int DemoRiderFriendCommunityIndex { get; init; } = 1;

    public string JohnPersonalRideName { get; init; } = "Weekend invite demo";

    public string AdminPersonalRideName { get; init; } = "Admin loop — invite demo";

    public string JohnAcceptedInviteRideName { get; init; } = "Invite accepted demo";

    /// <summary>Club ordinal where John is admin (see <see cref="DbSeeder"/> AddDemoMember).</summary>
    public int JohnAdminClubOrdinal { get; init; } = 2;

    /// <summary>Community index that requests to join John's admin club (not already on that club's roster).</summary>
    public int ClubJoinRequesterCommunityIndex { get; init; } = 0;

    /// <summary>Seed one accepted and one declined personal invite for inbox variety.</summary>
    public bool SeedAcceptedAndDeclinedInvites { get; init; } = true;
}
