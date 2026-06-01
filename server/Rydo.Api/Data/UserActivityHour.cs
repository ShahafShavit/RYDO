namespace Rydo.Api.Data;

/// <summary>Hourly rollup for heatmap: user was active during this UTC hour on this UTC day.</summary>
public class UserActivityHour
{
    public int UserId { get; set; }
    public ApplicationUser? User { get; set; }

    public DateOnly ActivityDateUtc { get; set; }

    /// <summary>0–23 UTC hour.</summary>
    public byte HourUtc { get; set; }
}
