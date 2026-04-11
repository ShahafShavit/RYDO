namespace Rydo.Api.Data;

public class SavedRoute
{
    public int UserId { get; set; }
    public ApplicationUser? User { get; set; }
    public int RouteId { get; set; }
    public RouteEntity? Route { get; set; }
}
