using Rydo.Api.Models;

namespace Rydo.Api.Services;

public interface ILeaderboardService
{
    Task<LeaderboardsResponseDto> GetSummariesAsync(int topN, CancellationToken ct);

    /// <summary>Ranks 1–3 only, using the same ordering as <see cref="GetSummariesAsync"/>.</summary>
    Task<IReadOnlyList<LeaderboardBadgeDto>> GetUserTopThreeBadgesAsync(int userId, CancellationToken ct);
}
