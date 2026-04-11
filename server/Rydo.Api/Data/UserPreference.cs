namespace Rydo.Api.Data;

public class UserPreference
{
    public int UserId { get; set; }
    public ApplicationUser? User { get; set; }
    public string DefaultBikeType { get; set; } = "road";
    public string DistanceUnit { get; set; } = "km";
    public bool NotificationsEnabled { get; set; } = true;
}
