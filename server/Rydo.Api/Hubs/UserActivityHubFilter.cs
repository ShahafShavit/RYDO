using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;
using Rydo.Api.Services;

namespace Rydo.Api.Hubs;

public sealed class UserActivityHubFilter(IUserActivityRecorder recorder) : IHubFilter
{
    public async ValueTask OnConnectedAsync(
        HubLifetimeContext context,
        Func<HubLifetimeContext, ValueTask> next)
    {
        var userId = GetUserId(context.Context.User ?? new ClaimsPrincipal());
        if (userId.HasValue)
            recorder.Record(userId.Value, DateTime.UtcNow);

        await next(context);
    }

    private static int? GetUserId(ClaimsPrincipal user)
    {
        var s = user.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(s, out var id) ? id : null;
    }
}
