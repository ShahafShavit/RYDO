namespace Rydo.Api;

/// <summary>Development-only automated club chat messages. Gated by <see cref="Enabled"/> and host Development environment.</summary>
public sealed class DemoClubChatSimulatorOptions
{
    public const string SectionName = "Rydo:DemoClubChatSimulator";

    public bool Enabled { get; set; }

    /// <summary>How often the simulator loop wakes to evaluate clubs (seconds).</summary>
    public int TickSeconds { get; set; } = 15;

    public int MinIntervalSeconds { get; set; } = 45;

    public int MaxIntervalSeconds { get; set; } = 180;

    public int MaxAutomatedMessagesPerClub { get; set; } = 10;
}
