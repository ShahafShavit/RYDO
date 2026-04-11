namespace Rydo.Api.Data;

/// <summary>How <see cref="RouteEntity.EstimatedDurationMinutes"/> was chosen (API + client use same string values).</summary>
public static class RouteDurationSource
{
    public const string GpxTimestamps = "gpx_timestamps";
    public const string EstimatedPace = "estimated_pace";
    /// <summary>Fallback when GPX has no usable times and pace could not be applied (e.g. client default).</summary>
    public const string Estimated = "estimated";
    public const string User = "user";
    public const string Unknown = "unknown";
}
