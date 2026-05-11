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
    /// <summary>When null, effective value falls back to the linked route.</summary>
    public int? DurationMinutes { get; set; }
    /// <summary>When null, effective value falls back to the linked route.</summary>
    public double? DistanceKm { get; set; }
    /// <summary>When null, effective value falls back to the linked route.</summary>
    public double? ElevationGainM { get; set; }

    /// <summary>Ride this completion belongs to (scheduled event or solo log).</summary>
    public int RideId { get; set; }
    public Ride? Ride { get; set; }
}
