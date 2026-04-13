namespace Rydo.Api.Models;

public record LeaderboardRowDto(int Rank, int UserId, string DisplayName, string? AvatarUrl, double Value, string Unit);

public record LeaderboardsResponseDto(
    IReadOnlyList<LeaderboardRowDto> HorizonChasers,
    IReadOnlyList<LeaderboardRowDto> SaddleJunkies,
    IReadOnlyList<LeaderboardRowDto> SummitSeekers,
    IReadOnlyList<LeaderboardRowDto> Trailblazers);

public record LeaderboardBadgeDto(string BoardId, int Rank);
