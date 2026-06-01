namespace Rydo.Api.Data;

/// <summary>Daily rollup: user was active on this UTC calendar day.</summary>
public class UserActivityDay
{
    public int UserId { get; set; }
    public ApplicationUser? User { get; set; }

    /// <summary>UTC date (time component ignored).</summary>
    public DateOnly ActivityDateUtc { get; set; }

    public DateTime FirstSeenAtUtc { get; set; }
    public DateTime LastSeenAtUtc { get; set; }
}
