namespace Rydo.Api.Data;

public enum RideKind
{
    /// <summary>Scheduled club or personal ride (calendar event).</summary>
    Scheduled = 0,

    /// <summary>Ride created only to anchor a completion log (typically one participant).</summary>
    SoloLog = 1,
}

public class Ride
{
    public int Id { get; set; }
    public RideKind Kind { get; set; } = RideKind.Scheduled;
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public DateTime ScheduledDate { get; set; }
    /// <summary>Optional; upcoming rides can be scheduled before a route is chosen.</summary>
    public int? RouteId { get; set; }
    public RouteEntity? Route { get; set; }
    public int MaxParticipants { get; set; } = 20;
    public int? ClubId { get; set; }
    public CyclingClub? Club { get; set; }
    /// <summary>User who created this ride (club or personal, or solo log).</summary>
    public int CreatedByUserId { get; set; }
    public ApplicationUser? CreatedBy { get; set; }
    public ICollection<RideParticipant> Participants { get; set; } = new List<RideParticipant>();
}

public class RideParticipant
{
    public int RideId { get; set; }
    public Ride? Ride { get; set; }
    public int UserId { get; set; }
    public ApplicationUser? User { get; set; }
}
