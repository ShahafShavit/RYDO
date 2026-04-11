namespace Rydo.Api.Data;

public class HistoryEntry
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public ApplicationUser? User { get; set; }
    public int RouteId { get; set; }
    public RouteEntity? Route { get; set; }
    public string RouteTitle { get; set; } = "";
    public DateTime CompletedAt { get; set; }
    public int DurationMinutes { get; set; }
    public double DistanceKm { get; set; }
    public double ElevationGainM { get; set; }

    /// <summary>Optional link to a scheduled group ride (club or personal) this completion is tied to.</summary>
    public int? RideGroupId { get; set; }
    public RideGroup? RideGroup { get; set; }
}
