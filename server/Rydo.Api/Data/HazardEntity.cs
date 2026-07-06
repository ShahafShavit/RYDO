namespace Rydo.Api.Data;

public class HazardEntity
{
    public int Id { get; set; }
    public int RouteId { get; set; }
    public RouteEntity? Route { get; set; }
    public int? RideId { get; set; }
    public Ride? Ride { get; set; }
    public string Type { get; set; } = "";
    public string Severity { get; set; } = "medium";
    public string Description { get; set; } = "";
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string? Region { get; set; }
    public int Score { get; set; } = 5;
    public string Status { get; set; } = "active";
    public int ReportedByUserId { get; set; }
    public ApplicationUser? ReportedBy { get; set; }
    public DateTime ReportedAt { get; set; }
    public ICollection<HazardVote> Votes { get; set; } = new List<HazardVote>();
}
