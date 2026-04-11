namespace Rydo.Api.Data;

public class RideGroup
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public DateTime ScheduledDate { get; set; }
    /// <summary>Optional; upcoming rides can be scheduled before a route is chosen.</summary>
    public int? RouteId { get; set; }
    public RouteEntity? Route { get; set; }
    public int MaxParticipants { get; set; } = 20;
    public int? ClubId { get; set; }
    public CyclingClub? Club { get; set; }
    public ICollection<RideParticipant> Participants { get; set; } = new List<RideParticipant>();
}

public class RideParticipant
{
    public int RideGroupId { get; set; }
    public RideGroup? RideGroup { get; set; }
    public int UserId { get; set; }
    public ApplicationUser? User { get; set; }
}
