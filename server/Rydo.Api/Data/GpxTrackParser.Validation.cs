using System.Xml.Linq;

namespace Rydo.Api.Data;

/// <summary>Blocks GPX tracks with impossible elevation, grades, or horizontal speeds (corrupt or merged data).</summary>
public static partial class GpxTrackParser
{
    // Aggregate: ~350 m/km sustained is already extreme; cap total gain to catch bogus cumulative elevation.
    private const double MaxGainPerKm = 350.0;
    private const double MaxAggregateElevationGainM = 15000.0;
    private const double MinAggregateGainFloorM = 200.0;

    // Segment: near-vertical jumps (bad baro/GPS) or sustained impossible grade.
    private const double SpikeVerticalM = 150.0;
    private const double SpikeHorizontalM = 40.0;
    private const double MinHorizontalForGradeM = 40.0;
    private const double MaxAbsGrade = 0.5;

    // Horizontal speed when both points have timestamps (~45 m/s ≈ 162 km/h; catches teleports).
    private const double MaxHorizontalSpeedMetersPerSecond = 45.0;
    private const double SameTimestampTeleportM = 50.0;

    /// <summary>
    /// Returns false if the file is not XML, has fewer than two track points, or fails plausibility checks.
    /// Intended to reject corrupted or merged GPX before seeding or persistence.
    /// </summary>
    public static bool IsTrackPlausible(byte[] gpxBytes, out string? rejectReason)
    {
        rejectReason = null;
        if (gpxBytes.Length == 0)
        {
            rejectReason = "GPX file is empty.";
            return false;
        }

        XDocument doc;
        try
        {
            using var ms = new MemoryStream(gpxBytes);
            doc = XDocument.Load(ms, LoadOptions.None);
        }
        catch
        {
            rejectReason = "GPX is not valid XML.";
            return false;
        }

        var points = CollectPoints(doc);
        if (points.Count < 2)
        {
            rejectReason = "GPX must contain a readable track with at least two points.";
            return false;
        }

        var distanceKm = 0.0;
        for (var i = 1; i < points.Count; i++)
            distanceKm += HaversineKm(points[i - 1].Lat, points[i - 1].Lon, points[i].Lat, points[i].Lon);

        var elevationGainM = ComputeSequentialElevationGainM(points);
        var maxAllowedGain = Math.Min(MaxAggregateElevationGainM, Math.Max(MinAggregateGainFloorM, distanceKm * MaxGainPerKm));
        if (elevationGainM > maxAllowedGain)
        {
            rejectReason =
                "This GPX has unrealistic total elevation gain for its distance (possible corrupt elevation data).";
            return false;
        }

        for (var i = 1; i < points.Count; i++)
        {
            var a = points[i - 1];
            var b = points[i];
            var horizM = HaversineKm(a.Lat, a.Lon, b.Lat, b.Lon) * 1000.0;

            if (a.EleMeters.HasValue && b.EleMeters.HasValue)
            {
                var dEle = Math.Abs(b.EleMeters.Value - a.EleMeters.Value);
                if (dEle > SpikeVerticalM && horizM < SpikeHorizontalM)
                {
                    rejectReason =
                        "This GPX contains a near-instantaneous elevation jump (possible corrupt elevation data).";
                    return false;
                }

                if (horizM >= MinHorizontalForGradeM && dEle / horizM > MaxAbsGrade)
                {
                    rejectReason = "This GPX contains an impossible slope between two points (possible corrupt data).";
                    return false;
                }
            }

            if (a.TimeUtc.HasValue && b.TimeUtc.HasValue)
            {
                var dt = (b.TimeUtc.Value - a.TimeUtc.Value).TotalSeconds;
                if (dt <= 0 && horizM > SameTimestampTeleportM)
                {
                    rejectReason =
                        "This GPX shows large movement with zero or negative time between points (possible corrupt timestamps).";
                    return false;
                }

                if (dt > 0 && horizM / dt > MaxHorizontalSpeedMetersPerSecond)
                {
                    rejectReason =
                        "This GPX implies impossible speed between two points (possible corrupt timestamps or positions).";
                    return false;
                }
            }
        }

        return true;
    }

    private static double ComputeSequentialElevationGainM(IReadOnlyList<TrackPoint> points)
    {
        double? lastEle = null;
        var gain = 0.0;
        foreach (var p in points)
        {
            if (!p.EleMeters.HasValue)
                continue;
            if (lastEle.HasValue && p.EleMeters.Value > lastEle.Value)
                gain += p.EleMeters.Value - lastEle.Value;
            lastEle = p.EleMeters.Value;
        }

        return gain;
    }
}
