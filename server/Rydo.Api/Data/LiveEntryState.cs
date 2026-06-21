namespace Rydo.Api.Data;

/// <summary>Singleton row for atomic sequential rider assignment (QR live entry).</summary>
public class LiveEntryState
{
    public int Id { get; set; } = 1;
    public int LastRiderIndex { get; set; }
}
