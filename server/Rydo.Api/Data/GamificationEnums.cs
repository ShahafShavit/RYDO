namespace Rydo.Api.Data;

public enum ChallengeKind
{
    Base = 0,
    Quest = 1,
    Modifier = 2,
}

public enum ChallengeRuleType
{
    Distance = 0,
    Elevation = 1,
    RideCount = 2,
    GroupRides = 3,
    LeaderboardTop3 = 4,
}

public enum ChallengeInstanceStatus
{
    Draft = 0,
    Published = 1,
    Ended = 2,
}

public static class HistorySourceKind
{
    public const string Seed = "seed";
    public const string Materialized = "materialized";
}

public static class XpSourceType
{
    public const string HistoryRide = "history_ride";
    public const string QuestComplete = "quest_complete";
    public const string BaseMilestone = "base_milestone";
}
