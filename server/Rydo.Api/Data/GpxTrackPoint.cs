namespace Rydo.Api.Data;

/// <summary>One point from a GPX track (trkpt/rtept/wpt fallback), for timelapse path sampling.</summary>
public readonly record struct GpxTrackPoint(
    double Latitude,
    double Longitude,
    double? ElevationMeters,
    DateTimeOffset? TimeUtc);
