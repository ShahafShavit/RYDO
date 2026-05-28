using Rydo.Api.Data;

namespace Rydo.Api;

/// <summary>Development-only pose simulators that log in as selected ride participants and call JoinRide / UpdatePose.</summary>
public sealed class DemoRideLiveBotsOptions
{
    public const string SectionName = "Rydo:DemoRideLiveBots";

    public bool Enabled { get; set; }

    /// <summary>
    /// API root for login + hub. Leave empty to derive from <c>ASPNETCORE_URLS</c> (required for Docker, e.g. <c>http://127.0.0.1:8080</c>).
    /// </summary>
    public string ApiBaseUrl { get; set; } = "";

    /// <summary>Password for simulated participants (must match bulk seeded riders, e.g. <see cref="DbSeeder.DemoRiderPassword"/>).</summary>
    public string BotPassword { get; set; } = DbSeeder.DemoRiderPassword;

    /// <summary>Approximate meters advanced along the polyline per update (demo pacing).</summary>
    public double StepMeters { get; set; } = 24;
}
