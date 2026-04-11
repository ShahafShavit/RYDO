namespace Rydo.Api.Data;

public class ChallengeEntity
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public double TargetValue { get; set; }
    public double CurrentValue { get; set; }
    public string Unit { get; set; } = "km";
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public bool IsActive { get; set; } = true;
}
