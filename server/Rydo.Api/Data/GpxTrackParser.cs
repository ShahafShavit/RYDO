using System.Globalization;
using System.Xml.Linq;

namespace Rydo.Api.Data;

/// <summary>Parses common GPX 1.0/1.1 track/route/waypoint structures for seed metrics.</summary>
public static class GpxTrackParser
{
    /// <summary>
    /// Extracts first/last coordinates for preview JSON, approximate path distance, and elevation gain from &lt;ele&gt; tags when present.
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

        var first = points[0];
        var last = points[^1];
        previewCoordinatesJson =
            $"[[{first.Lat.ToString("F5", CultureInfo.InvariantCulture)},{first.Lon.ToString("F5", CultureInfo.InvariantCulture)}]," +
            $"[{last.Lat.ToString("F5", CultureInfo.InvariantCulture)},{last.Lon.ToString("F5", CultureInfo.InvariantCulture)}]]";

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
