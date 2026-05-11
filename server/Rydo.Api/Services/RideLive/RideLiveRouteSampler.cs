using System.Text.Json;

namespace Rydo.Api.Services.RideLive;

public static class RideLiveRouteSampler
{
    private const double EarthRadiusM = 6371000;

    public static List<(double Lng, double Lat)> ParsePreviewCoordinates(string? previewCoordinatesJson)
    {
        if (string.IsNullOrWhiteSpace(previewCoordinatesJson) || previewCoordinatesJson == "[]")
            return [];

        List<List<double>>? coords;
        try
        {
            coords = JsonSerializer.Deserialize<List<List<double>>>(previewCoordinatesJson);
        }
        catch
        {
            return [];
        }

        if (coords == null) return [];
        var list = new List<(double, double)>();
        foreach (var c in coords)
        {
            if (c.Count < 2) continue;
            list.Add((c[0], c[1]));
        }

        return list;
    }

    /// <summary>Returns position after advancing <paramref name="deltaMeters"/> from <paramref name="distanceAlongM"/> (clamped / wrap).</summary>
    public static (double Lng, double Lat, double BearingDeg) Advance(
        IReadOnlyList<(double Lng, double Lat)> pts,
        ref double distanceAlongM,
        double deltaMeters)
    {
        if (pts.Count == 0)
            return (0, 0, 0);
        if (pts.Count == 1)
            return (pts[0].Lng, pts[0].Lat, 0);

        var total = PolylineLengthMeters(pts);
        if (total < 1)
            return (pts[0].Lng, pts[0].Lat, BearingDeg(pts[0], pts[^1]));

        distanceAlongM += deltaMeters;
        while (distanceAlongM >= total)
            distanceAlongM -= total;

        var d = 0.0;
        for (var i = 0; i < pts.Count - 1; i++)
        {
            var a = pts[i];
            var b = pts[i + 1];
            var seg = HaversineM(a.Lat, a.Lng, b.Lat, b.Lng);
            if (seg < 0.01)
                continue;
            if (d + seg >= distanceAlongM)
            {
                var t = (distanceAlongM - d) / seg;
                var lng = a.Lng + (b.Lng - a.Lng) * t;
                var lat = a.Lat + (b.Lat - a.Lat) * t;
                return (lng, lat, BearingDeg(a, b));
            }

            d += seg;
        }

        var last = pts[^1];
        var prev = pts[^2];
        return (last.Lng, last.Lat, BearingDeg(prev, last));
    }

    private static double PolylineLengthMeters(IReadOnlyList<(double Lng, double Lat)> pts)
    {
        var sum = 0.0;
        for (var i = 0; i < pts.Count - 1; i++)
            sum += HaversineM(pts[i].Lat, pts[i].Lng, pts[i + 1].Lat, pts[i + 1].Lng);
        return sum;
    }

    private static double HaversineM(double lat1, double lon1, double lat2, double lon2)
    {
        var φ1 = lat1 * (Math.PI / 180);
        var φ2 = lat2 * (Math.PI / 180);
        var Δφ = (lat2 - lat1) * (Math.PI / 180);
        var Δλ = (lon2 - lon1) * (Math.PI / 180);
        var s1 = Math.Sin(Δφ / 2);
        var s2 = Math.Sin(Δλ / 2);
        var h = s1 * s1 + Math.Cos(φ1) * Math.Cos(φ2) * s2 * s2;
        return 2 * EarthRadiusM * Math.Asin(Math.Min(1, Math.Sqrt(h)));
    }

    private static double BearingDeg((double Lng, double Lat) from, (double Lng, double Lat) to)
    {
        var φ1 = from.Lat * (Math.PI / 180);
        var φ2 = to.Lat * (Math.PI / 180);
        var Δλ = (to.Lng - from.Lng) * (Math.PI / 180);
        var y = Math.Sin(Δλ) * Math.Cos(φ2);
        var x = Math.Cos(φ1) * Math.Sin(φ2) - Math.Sin(φ1) * Math.Cos(φ2) * Math.Cos(Δλ);
        var θ = Math.Atan2(y, x) * (180 / Math.PI);
        return (θ + 360) % 360;
    }
}
