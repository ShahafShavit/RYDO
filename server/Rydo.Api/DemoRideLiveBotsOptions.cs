using Rydo.Api.Data;

namespace Rydo.Api;

/// <summary>Development-only SignalR bots that log in as seeded users and call JoinRide / UpdatePose.</summary>
public sealed class DemoRideLiveBotsOptions
{
    public const string SectionName = "Rydo:DemoRideLiveBots";

    public bool Enabled { get; set; }

    /// <summary>
    /// API root for bot login + hub. Leave empty to derive from <c>ASPNETCORE_URLS</c> (required for Docker, e.g. <c>http://127.0.0.1:8080</c>).
    /// </summary>
    public string ApiBaseUrl { get; set; } = "";

    public string BotPassword { get; set; } = DbSeeder.DemoRiderPassword;

    public string[] BotEmails { get; set; } =
    [
        DbSeeder.LiveBot1Email,
        DbSeeder.LiveBot2Email,
        DbSeeder.LiveBot3Email,
    ];

    /// <summary>
    /// When a user with one of these emails opens live, bots are added to <b>that</b> ride and connect (Development + Enabled only).
    /// </summary>
    public string[] TriggerEmails { get; set; } =
    [
        DbSeeder.AdminEmail,
        DbSeeder.UserEmail,
    ];

    /// <summary>Minimum milliseconds between UpdatePose per bot.</summary>
    public int UpdateIntervalMs { get; set; } = 2000;

    /// <summary>Approximate meters advanced along the polyline per update (demo pacing).</summary>
    public double StepMeters { get; set; } = 24;
}
