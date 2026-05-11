namespace Rydo.Api.Services;

/// <summary>Great-circle distance on the WGS84 sphere (same formula as GPX path length uses elsewhere).</summary>
public static class GeoDistance
{
    private const double EarthRadiusKm = 6371.0;

    public static double HaversineKm(double lat1Deg, double lon1Deg, double lat2Deg, double lon2Deg)
    {
        var dLat = (lat2Deg - lat1Deg) * (Math.PI / 180.0);
        var dLon = (lon2Deg - lon1Deg) * (Math.PI / 180.0);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
                + Math.Cos(lat1Deg * (Math.PI / 180.0)) * Math.Cos(lat2Deg * (Math.PI / 180.0))
                * Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return EarthRadiusKm * c;
    }
}
