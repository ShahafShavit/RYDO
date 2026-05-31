using Rydo.Api.Models;

namespace Rydo.Api.Services;

public interface IUserLifetimeStatsService
{
    Task<UserLifetimeStatsDto> GetAsync(int userId, CancellationToken ct = default);
}
