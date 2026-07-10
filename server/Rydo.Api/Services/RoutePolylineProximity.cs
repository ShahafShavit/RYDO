using Rydo.Api.Data;
using Rydo.Api.Services.RideLive;

namespace Rydo.Api.Services;

/// <summary>Nearest-point-on-polyline snap (mirrors client routeProximity.js).</summary>
public static class RoutePolylineProximity
{
    public readonly record struct SnapResult(double DistanceFromRouteM, double DistanceAlongRouteM);

    /// <summary>
    /// Snap a hazard point to the route polyline using preview coordinates, with optional GPX fallback.
    /// </summary>
    public static SnapResult? Snap(
        string? previewCoordinatesJson,
        byte[]? gpxBlob,
        double latitude,
        double longitude)
    {
        var pts = ParseRoutePoints(previewCoordinatesJson, gpxBlob);
        return SnapToPoints(pts, latitude, longitude);
    }

    /// <summary>Snap to an already-parsed polyline.</summary>
    public static SnapResult? SnapToPoints(
        IReadOnlyList<(double Lng, double Lat)> pts,
        double latitude,
        double longitude)
    {
        if (pts.Count < 2)
            return null;

        var cum = CumulativeDistancesM(pts);
        var bestDist = double.PositiveInfinity;
        var bestAlong = 0.0;

        for (var i = 0; i < pts.Count - 1; i++)
        {
            var a = pts[i];
            var b = pts[i + 1];
            var (t, distanceM) = ClosestOnSegmentM(latitude, longitude, a.Lat, a.Lng, b.Lat, b.Lng);
            if (distanceM < bestDist)
            {
                bestDist = distanceM;
                var span = cum[i + 1] - cum[i];
                bestAlong = cum[i] + t * span;
            }
        }

        if (!double.IsFinite(bestDist))
            return null;

        return new SnapResult(bestDist, bestAlong);
    }

    public static List<(double Lng, double Lat)> ParseRoutePoints(string? previewCoordinatesJson, byte[]? gpxBlob)
    {
        var pts = RideLiveRouteSampler.ParsePreviewCoordinates(previewCoordinatesJson);
        if (pts.Count >= 2)
            return pts;

        if (gpxBlob is { Length: > 0 }
            && GpxTrackParser.TryParseTrackPoints(gpxBlob, maxPoints: 4096, out var trackPoints)
            && trackPoints.Count >= 2)
        {
            return trackPoints.Select(p => (p.Longitude, p.Latitude)).ToList();
        }

        return pts;
    }

    private static List<double> CumulativeDistancesM(IReadOnlyList<(double Lng, double Lat)> pts)
    {
        var cum = new List<double>(pts.Count) { 0 };
        for (var i = 1; i < pts.Count; i++)
        {
            var prev = pts[i - 1];
            var cur = pts[i];
            cum.Add(cum[i - 1] + GeoDistance.HaversineM(prev.Lat, prev.Lng, cur.Lat, cur.Lng));
        }

        return cum;
    }

    private static (double T, double DistanceM) ClosestOnSegmentM(
        double lat,
        double lng,
        double latA,
        double lngA,
        double latB,
        double lngB)
    {
        var lo = 0.0;
        var hi = 1.0;
        for (var iter = 0; iter < 20; iter++)
        {
            var t1 = lo + (hi - lo) / 3;
            var t2 = hi - (hi - lo) / 3;
            var lat1 = latA + t1 * (latB - latA);
            var lng1 = lngA + t1 * (lngB - lngA);
            var lat2 = latA + t2 * (latB - latA);
            var lng2 = lngA + t2 * (lngB - lngA);
            var d1 = GeoDistance.HaversineM(lat, lng, lat1, lng1);
            var d2 = GeoDistance.HaversineM(lat, lng, lat2, lng2);
            if (d1 < d2)
                hi = t2;
            else
                lo = t1;
        }

        var t = (lo + hi) / 2;
        var closestLat = latA + t * (latB - latA);
        var closestLng = lngA + t * (lngB - lngA);
        return (t, GeoDistance.HaversineM(lat, lng, closestLat, closestLng));
    }
}
