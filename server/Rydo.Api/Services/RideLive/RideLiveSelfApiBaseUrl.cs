namespace Rydo.Api.Services.RideLive;

/// <summary>
/// Base URL the API should call for <b>in-process</b> self-requests (dev-only ride-live bots: login + SignalR).
/// Docker/ECS use <c>http://+:8080</c>, which must become <c>http://127.0.0.1:8080</c> for <see cref="HttpClient"/>.
/// Production (AWS) does not run bots (<see cref="RideLiveBotOrchestrator"/>); public clients use CloudFront/ALB URLs unchanged.
/// </summary>
public static class RideLiveSelfApiBaseUrl
{
    public static string Resolve(IConfiguration configuration, DemoRideLiveBotsOptions? options = null)
    {
        var configured = options?.ApiBaseUrl?.Trim();
        if (!string.IsNullOrEmpty(configured))
            return configured.TrimEnd('/');

        var urls = configuration["ASPNETCORE_URLS"]
                   ?? Environment.GetEnvironmentVariable("ASPNETCORE_URLS");
        if (string.IsNullOrWhiteSpace(urls))
            return "http://localhost:5032";

        var parts = urls.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (parts.Length == 0)
            return "http://localhost:5032";

        // Prefer plain HTTP for in-process self-calls (avoids dev certificate issues).
        var http = parts.FirstOrDefault(p => p.StartsWith("http://", StringComparison.OrdinalIgnoreCase));
        var pick = (http ?? parts[0]).Trim();
        return NormalizeForLocalHttpClient(pick).TrimEnd('/');
    }

    private static string NormalizeForLocalHttpClient(string url)
    {
        if (url.Contains("://+:", StringComparison.Ordinal))
            return url.Replace("://+:", "://127.0.0.1:", StringComparison.Ordinal);
        if (url.Contains("://*:", StringComparison.Ordinal))
            return url.Replace("://*:", "://127.0.0.1:", StringComparison.Ordinal);
        if (url.Contains("://0.0.0.0:", StringComparison.Ordinal))
            return url.Replace("://0.0.0.0:", "://127.0.0.1:", StringComparison.Ordinal);
        return url;
    }
}
