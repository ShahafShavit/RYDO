namespace Rydo.Api.Data;

/// <summary>Recipient for a seeded pending friend request (inbox row).</summary>
public enum FriendInboxPendingRecipient
{
    Admin,
    /// <summary>Primary demo login (<c>user@rydo.test</c>).</summary>
    DemoRider,
}

/// <summary>
/// Deterministic friendship / pending-request graph over the community rider pool.
/// Community users are ordered by index: <c>0</c> = <c>rider{Start+0}</c>, <c>1</c> = <c>rider{Start+1}</c>, …
/// where <c>Start</c> = <see cref="DbSeedProfile.CommunityRiderEmailStartNumber"/>. Missing users are skipped.
/// </summary>
public sealed class FriendInboxSeedSpec
{
    /// <summary>
    /// Seeds friendships between adjacent pairs <c>(0,1), (2,3), …</c> for this many pairs.
    /// </summary>
    public int AdjacentCommunityPairCount { get; init; } = 2;

    /// <summary>Optional edge: admin befriends this community index (e.g. <c>2</c> = third rider).</summary>
    public int? AdminBefriendsCommunityIndex { get; init; } = 2;

    /// <summary>Optional edge: demo rider (<c>user@rydo.test</c>) befriends this community index.</summary>
    public int? DemoRiderBefriendsCommunityIndex { get; init; } = 1;

    /// <summary>
    /// Pending requests: for <c>i</c> in <c>0 .. <see cref="PendingRequestCount"/> - 1</c>,
    /// from community index <c><see cref="PendingFirstCommunityIndex"/> + i</c> to
    /// <c><see cref="PendingRecipientCycle"/>[i % cycle.Length]</c>.
    /// </summary>
    public int PendingFirstCommunityIndex { get; init; } = 4;

    public int PendingRequestCount { get; init; } = 3;

    public FriendInboxPendingRecipient[] PendingRecipientCycle { get; init; } =
    [
        FriendInboxPendingRecipient.Admin,
        FriendInboxPendingRecipient.DemoRider,
        FriendInboxPendingRecipient.Admin,
    ];

    /// <summary>If fewer than this many community accounts exist at indices 0 and 1, friend inbox seed is skipped.</summary>
    public int MinimumCommunityUsersForSeed { get; init; } = 2;
}
