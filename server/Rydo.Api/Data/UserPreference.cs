namespace Rydo.Api.Data;

public class UserPreference
{
    public int UserId { get; set; }
    public ApplicationUser? User { get; set; }
    public string DefaultBikeType { get; set; } = "road";
    public string DistanceUnit { get; set; } = "km";
    public bool NotificationsEnabled { get; set; } = true;

    /// <summary>When true, the user may appear by name in &quot;who rode this route&quot; lists.</summary>
    public bool PublicInRouteRiderLists { get; set; } = true;

    /// <summary>Client UI color scheme id (e.g. midnight, daylight).</summary>
    public string ColorScheme { get; set; } = "midnight";
}
