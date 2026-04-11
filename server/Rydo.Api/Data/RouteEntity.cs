namespace Rydo.Api.Data;

public class RouteEntity
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string Terrain { get; set; } = "mixed";
    public string Difficulty { get; set; } = "moderate";
    public string? Region { get; set; }
    public double DistanceKm { get; set; }
    public double ElevationGainM { get; set; }
    public int EstimatedDurationMinutes { get; set; }
    public string WarningsJson { get; set; } = "[]";
    public string? Notes { get; set; }
    public string? GpxReference { get; set; }
    public byte[]? GpxBlob { get; set; }
    public string PreviewCoordinatesJson { get; set; } = "[]";
    public int CreatedByUserId { get; set; }
    public ApplicationUser? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public string Status { get; set; } = "published";
}
