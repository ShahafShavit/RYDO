using System.Globalization;
using System.Text.Json;
using System.Xml.Linq;

namespace Rydo.Api.Data;

/// <summary>Parses common GPX 1.0/1.1 track/route/waypoint structures for seed metrics.</summary>
public static class GpxTrackParser
{
    private const int MaxPreviewPoints = 400;

    /// <summary>
    /// Builds a downsampled track as GeoJSON coordinate order <c>[longitude, latitude]</c> JSON, plus distance and elevation gain from &lt;ele&gt; tags when present.
    /// </summary>
    public static bool TryParse(byte[] gpxBytes, out string previewCoordinatesJson, out double distanceKm, out double elevationGainM)
    {
        previewCoordinatesJson = "[]";
        distanceKm = 0;
        elevationGainM = 0;

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

        var points = CollectPoints(doc);
        if (points.Count < 2)
            return false;

        var sampled = DownsampleTrack(points, MaxPreviewPoints);
        var lonLatPairs = new List<List<double>>(sampled.Count);
        foreach (var p in sampled)
            lonLatPairs.Add(new List<double> { p.Lon, p.Lat });
        previewCoordinatesJson = JsonSerializer.Serialize(lonLatPairs);

        for (var i = 1; i < points.Count; i++)
            distanceKm += HaversineKm(points[i - 1].Lat, points[i - 1].Lon, points[i].Lat, points[i].Lon);

        distanceKm = Math.Round(distanceKm, 1);

        double? lastEle = null;
        foreach (var p in points)
        {
            if (!p.EleMeters.HasValue)
                continue;
            if (lastEle.HasValue && p.EleMeters.Value > lastEle.Value)
                elevationGainM += p.EleMeters.Value - lastEle.Value;
            lastEle = p.EleMeters.Value;
        }

        elevationGainM = Math.Round(elevationGainM, 0);
        return true;
    }

    private static List<TrackPoint> DownsampleTrack(IReadOnlyList<TrackPoint> points, int maxPoints)
    {
        if (points.Count <= maxPoints)
            return points.ToList();

        var picked = new List<TrackPoint>(maxPoints);
        for (var i = 0; i < maxPoints; i++)
        {
            var idx = (int)Math.Round(i / (double)(maxPoints - 1) * (points.Count - 1));
            picked.Add(points[idx]);
        }

        var result = new List<TrackPoint>(picked.Count);
        foreach (var p in picked)
        {
            if (result.Count == 0 || result[^1].Lat != p.Lat || result[^1].Lon != p.Lon)
                result.Add(p);
        }

        var last = points[^1];
        if (result.Count == 0 || result[^1].Lat != last.Lat || result[^1].Lon != last.Lon)
            result.Add(last);

        return result.Count >= 2 ? result : points.ToList();
    }

    private readonly record struct TrackPoint(double Lat, double Lon, double? EleMeters);

    private static List<TrackPoint> CollectPoints(XDocument doc)
    {
        var list = new List<TrackPoint>();
        foreach (var el in doc.Descendants())
        {
            if (el.Name.LocalName != "trkpt" && el.Name.LocalName != "rtept")
                continue;
            if (!TryReadLatLon(el, out var lat, out var lon))
                continue;
            list.Add(new TrackPoint(lat, lon, ReadEle(el)));
        }

        if (list.Count >= 2)
            return list;

        list.Clear();
        foreach (var el in doc.Descendants())
        {
            if (el.Name.LocalName != "wpt")
                continue;
            if (!TryReadLatLon(el, out var lat, out var lon))
                continue;
            list.Add(new TrackPoint(lat, lon, ReadEle(el)));
        }

        return list;
    }

    private static bool TryReadLatLon(XElement el, out double lat, out double lon)
    {
        lat = 0;
        lon = 0;
        var aLat = el.Attribute("lat");
        var aLon = el.Attribute("lon");
        if (aLat == null || aLon == null)
            return false;
        return double.TryParse(aLat.Value, NumberStyles.Float, CultureInfo.InvariantCulture, out lat)
               && double.TryParse(aLon.Value, NumberStyles.Float, CultureInfo.InvariantCulture, out lon);
    }

    private static double? ReadEle(XElement point)
    {
        foreach (var child in point.Elements())
        {
            if (child.Name.LocalName != "ele")
                continue;
            if (double.TryParse(child.Value.Trim(), NumberStyles.Float, CultureInfo.InvariantCulture, out var m))
                return m;
            return null;
        }

        return null;
    }

    private static double HaversineKm(double lat1, double lon1, double lat2, double lon2)
    {
        const double rKm = 6371.0;
        var dLat = (lat2 - lat1) * (Math.PI / 180.0);
        var dLon = (lon2 - lon1) * (Math.PI / 180.0);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
                + Math.Cos(lat1 * (Math.PI / 180.0)) * Math.Cos(lat2 * (Math.PI / 180.0))
                * Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return rKm * c;
    }
}
