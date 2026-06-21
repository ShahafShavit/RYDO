namespace Rydo.Api;

public sealed class DemoLiveEntryOptions
{
    public const string SectionName = "Rydo:LiveEntry";

    public bool Enabled { get; set; }

    /// <summary>HMAC signing key for booth tokens. Auto-generated in Development when empty.</summary>
    public string BoothSigningKey { get; set; } = "";

    public string RideName { get; set; } = "Live Demo — QR Entry";

    public string RouteGpxFileName { get; set; } = "groopy-2448.gpx";

    public int RiderEmailStartNumber { get; set; } = 3;

    public int RiderCount { get; set; } = 34;

    public int ChallengeTtlSeconds { get; set; } = 90;

    public int BoothTokenTtlDays { get; set; } = 30;

    public int RateLimitPermitLimit { get; set; } = 500;

    public int RateLimitWindowHours { get; set; } = 1;

    public string RiderEmail(int index) =>
        $"rider{RiderEmailStartNumber + index:000}@rydo.test";
}
