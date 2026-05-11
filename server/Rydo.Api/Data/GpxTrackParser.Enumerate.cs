using System.Xml.Linq;

namespace Rydo.Api.Data;

public static partial class GpxTrackParser
{
    /// <summary>Safety ceiling when retaining all GPX vertices (pathological files).</summary>
    public const int MaxTimelapseTrackPointsHardCap = 250_000;

    /// <summary>Default max when callers request downsampling (legacy / bounded workloads).</summary>
    public const int DefaultTimelapseTrackPointsSample = 4096;

    /// <summary>
    /// Returns an ordered list of track points. If <paramref name="maxPoints"/> is 0 or negative, keeps all
    /// points up to <see cref="MaxTimelapseTrackPointsHardCap"/>; otherwise downsample evenly to at most
    /// <paramref name="maxPoints"/> (still capped by the hard cap).
    /// </summary>
    public static bool TryParseTrackPoints(byte[] gpxBytes, int maxPoints, out IReadOnlyList<GpxTrackPoint> trackPoints)
    {
        trackPoints = Array.Empty<GpxTrackPoint>();
        if (gpxBytes.Length == 0)
            return false;

        XDocument doc;
        try
        {
            using var ms = new MemoryStream(gpxBytes);
            doc = XDocument.Load(ms, LoadOptions.None);
        }
        catch
        {
            return false;
        }

        var raw = CollectPoints(doc);
        if (raw.Count < 2)
            return false;

        List<TrackPoint> sampled;
        if (maxPoints <= 0)
        {
            sampled = raw.Count > MaxTimelapseTrackPointsHardCap
                ? DownsampleTrack(raw, MaxTimelapseTrackPointsHardCap)
                : raw;
        }
        else
        {
            var cap = Math.Min(Math.Max(maxPoints, 2), MaxTimelapseTrackPointsHardCap);
            sampled = raw.Count > cap ? DownsampleTrack(raw, cap) : raw;
        }

        var list = new List<GpxTrackPoint>(sampled.Count);
        foreach (var p in sampled)
            list.Add(new GpxTrackPoint(p.Lat, p.Lon, p.EleMeters, p.TimeUtc));

        trackPoints = list;
        return true;
    }
}
