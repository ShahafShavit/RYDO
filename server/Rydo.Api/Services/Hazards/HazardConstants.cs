namespace Rydo.Api.Services.Hazards;

public static class HazardConstants
{
    public const int InitialScore = 5;
    public const int VoteRadiusM = 200;
    public const int DedupRadiusM = 200;
    public const int TtlMonths = 6;
    public const int DescriptionMaxLength = 140;

    public static readonly HashSet<string> AllowedTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "pothole",
        "construction",
        "debris",
        "flooding",
        "poor_lighting",
        "road_damage",
        "glass",
        "animals",
        "gate",
        "other",
    };

    public const string StatusActive = "active";
    public const string StatusHidden = "hidden";
}
