using System.Security.Claims;
using Rydo.Api.Services;

namespace Rydo.Api.Middleware;

public sealed class UserActivityMiddleware(RequestDelegate next)
{
    public Task InvokeAsync(HttpContext context, IUserActivityRecorder recorder)
    {
        if (ShouldRecord(context))
        {
            var userId = GetUserId(context.User);
            if (userId.HasValue)
                recorder.Record(userId.Value, DateTime.UtcNow);
        }

        return next(context);
    }

    private static bool ShouldRecord(HttpContext context)
    {
        if (!context.User.Identity?.IsAuthenticated ?? true)
            return false;

        if (HttpMethods.IsOptions(context.Request.Method))
            return false;

        var path = context.Request.Path.Value ?? "";
        if (path.StartsWith("/health", StringComparison.OrdinalIgnoreCase))
            return false;

        if (!path.StartsWith("/api/", StringComparison.OrdinalIgnoreCase)
            && !path.StartsWith("/hubs/", StringComparison.OrdinalIgnoreCase))
            return false;

        return true;
    }

    private static int? GetUserId(ClaimsPrincipal user)
    {
        var s = user.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(s, out var id) ? id : null;
    }
}
