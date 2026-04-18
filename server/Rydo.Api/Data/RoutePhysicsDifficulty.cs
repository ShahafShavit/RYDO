namespace Rydo.Api.Data;

/// <summary>
/// Deterministic mechanical intensity from GPX geometry, aligned with
/// <c>scraper/physics/ml/physics_difficulty.py</c> (<see cref="PhysicsParams"/>: <c>elev_smooth_window=5</c>, <c>si_window_m=50</c>).
/// Density is J/km; scores use fixed P5–P95 band (see <c>TrailPhysicsNotebookCalibration</c>; recompute when PARAMS or corpus change).
/// </summary>
public static class RoutePhysicsDifficulty
{
    private const double EarthRadiusM = 6_371_000.0;

    /// <summary>Defaults matching <c>PhysicsParams</c> in <c>physics_difficulty.py</c>.</summary>
    public sealed record PhysicsParams(
        double MassKg = 85.0,
        double G = 9.80665,
        double CRr = 0.02,
        int ElevSmoothWindow = 5,
        double MinSegmentM = 0.5,
        double SiWindowM = 50.0,
        double Beta = 1.0,
        double Gamma = 1.0);

    /// <summary>
    /// P5/P95 of intensity density (J/km) over <c>server/Rydo.Api/GpxSeed/*.gpx</c> with default <see cref="PhysicsParams"/> (Python <c>PhysicsParams()</c>).
    /// Recompute with the physics notebook or a small script after changing PARAMS or replacing seed GPX.
    /// </summary>
    public static class TrailPhysicsNotebookCalibration
    {
        public const double NormalizationDensityLow = 21_197.75482206089;

        public const double NormalizationDensityHigh = 151_547.42390444392;
    }

    /// <summary>Maps density to 1–10 on the fixed corpus band (one decimal, clipped then capped).</summary>
    public static double DensityToNotebookScaledScore(double densityJPerKm) =>
        DensityToPhysicsScore(
            densityJPerKm,
            TrailPhysicsNotebookCalibration.NormalizationDensityLow,
            TrailPhysicsNotebookCalibration.NormalizationDensityHigh);

    /// <summary>Returns false if the track is degenerate or cannot be parsed.</summary>
    public static bool TryComputeIntensityDensityJPerKm(byte[] gpxBytes, out double densityJPerKm, PhysicsParams? p = null)
    {
        densityJPerKm = double.NaN;
        if (gpxBytes.Length == 0)
            return false;
        if (!GpxTrackParser.TryParseTrackPoints(gpxBytes, maxPoints: 0, out var pts) || pts.Count < 2)
            return false;

        var pr = p ?? new PhysicsParams();
        var n = pts.Count;
        var rawEle = new double?[n];
        var lat = new double[n];
        var lon = new double[n];
        for (var i = 0; i < n; i++)
        {
            var tp = pts[i];
            lat[i] = tp.Latitude;
            lon[i] = tp.Longitude;
            rawEle[i] = tp.ElevationMeters;
        }

        var eleFilled = InterpolateElevationLinear(rawEle);
        var eleSm = RollingMedianCentered(eleFilled, Math.Max(3, pr.ElevSmoothWindow | 1));

        var ds = new double[n - 1];
        for (var i = 0; i < n - 1; i++)
            ds[i] = HaversineM(lat[i], lon[i], lat[i + 1], lon[i + 1]);

        var dTotal = ds.Sum();
        if (dTotal < pr.MinSegmentM)
            return false;

        var dh = new double[n - 1];
        for (var i = 0; i < n - 1; i++)
            dh[i] = eleSm[i + 1] - eleSm[i];

        var elevGain = 0.0;
        var dForRoll = 0.0;
        for (var i = 0; i < n - 1; i++)
        {
            if (ds[i] < pr.MinSegmentM)
                continue;
            dForRoll += ds[i];
            if (dh[i] > 0)
                elevGain += dh[i];
        }

        if (dForRoll < 1.0)
            dForRoll = dTotal;

        var wGrav = pr.MassKg * pr.G * elevGain;
        var wRoll = pr.CRr * pr.MassKg * pr.G * dForRoll;

        var cum = new double[n];
        cum[0] = 0;
        for (var i = 0; i < n - 1; i++)
            cum[i + 1] = cum[i] + ds[i];

        RollingSinuosityP90(lat, lon, cum, pr.SiWindowM, out var siP90);

        var kf = KineticFactor(siP90, pr.Beta, pr.Gamma);
        densityJPerKm = (wGrav + kf * wRoll) / dForRoll * 1000.0;
        return double.IsFinite(densityJPerKm) && densityJPerKm > 0;
    }

    /// <summary>Maps density to [1, 10] using clip to <paramref name="densityLow"/>..<paramref name="densityHigh"/> then linear scale; values beyond the band cap at 1 or 10.</summary>
    public static double DensityToPhysicsScore(double density, double densityLow, double densityHigh)
    {
        if (!double.IsFinite(density))
            return double.NaN;
        if (!double.IsFinite(densityLow) || !double.IsFinite(densityHigh))
            throw new ArgumentException("Calibration bounds must be finite.");
        var hi = densityHigh <= densityLow + 1e-15 ? densityLow + 1e-15 : densityHigh;
        var lo = densityLow;
        var clipped = Math.Clamp(density, lo, hi);
        var raw = 1.0 + (clipped - lo) / (hi - lo) * 9.0;
        var capped = Math.Clamp(raw, 1.0, 10.0);
        return Math.Round(capped, 1, MidpointRounding.AwayFromZero);
    }

    private static double KineticFactor(double siP90, double beta, double gamma)
    {
        var x = Math.Max(siP90 - 1.0, 0.0);
        return 1.0 + beta * Math.Pow(x, gamma);
    }

    private static void RollingSinuosityP90(
        double[] lat,
        double[] lon,
        double[] cumDistM,
        double windowM,
        out double siP90)
    {
        siP90 = 1.0;
        var n = lat.Length;
        if (n < 3)
            return;

        var siList = new List<double>();
        var j = 0;
        for (var i = 0; i < n - 1; i++)
        {
            while (j < n && cumDistM[j] - cumDistM[i] < windowM)
                j++;
            if (j >= n)
                break;
            var arc = cumDistM[j] - cumDistM[i];
            var chord = HaversineM(lat[i], lon[i], lat[j], lon[j]);
            if (chord < 1.0)
                continue;
            siList.Add(arc / chord);
        }

        if (siList.Count == 0)
            return;

        var arr = siList.ToArray();
        Array.Sort(arr);
        siP90 = PercentileSorted(arr, 90.0);
    }

    private static double PercentileSorted(double[] sortedFinite, double p)
    {
        if (sortedFinite.Length == 0)
            return double.NaN;
        if (sortedFinite.Length == 1)
            return sortedFinite[0];
        var pos = p / 100.0 * (sortedFinite.Length - 1);
        var lo = (int)Math.Floor(pos);
        var hi = (int)Math.Ceiling(pos);
        if (lo == hi)
            return sortedFinite[lo];
        var t = pos - lo;
        return sortedFinite[lo] * (1.0 - t) + sortedFinite[hi] * t;
    }

    private static double HaversineM(double lat1, double lon1, double lat2, double lon2)
    {
        var rlat1 = lat1 * (Math.PI / 180.0);
        var rlat2 = lat2 * (Math.PI / 180.0);
        var dlat = (lat2 - lat1) * (Math.PI / 180.0);
        var dlon = (lon2 - lon1) * (Math.PI / 180.0);
        var a = Math.Sin(dlat / 2.0) * Math.Sin(dlat / 2.0)
                + Math.Cos(rlat1) * Math.Cos(rlat2) * Math.Sin(dlon / 2.0) * Math.Sin(dlon / 2.0);
        a = Math.Clamp(a, 0.0, 1.0);
        var c = 2.0 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1.0 - a));
        return EarthRadiusM * c;
    }

    /// <summary>Linear interpolation between known elevations; leading/trailing gaps use nearest known (pandas interpolate + bfill/ffill).</summary>
    private static double[] InterpolateElevationLinear(IReadOnlyList<double?> raw)
    {
        var n = raw.Count;
        var y = new double[n];
        var known = new bool[n];
        for (var i = 0; i < n; i++)
        {
            if (raw[i].HasValue && double.IsFinite(raw[i]!.Value))
            {
                y[i] = raw[i]!.Value;
                known[i] = true;
            }
        }

        var firstKnown = -1;
        for (var i = 0; i < n; i++)
        {
            if (!known[i])
                continue;
            firstKnown = i;
            break;
        }

        if (firstKnown < 0)
            return new double[n];

        for (var i = 0; i < firstKnown; i++)
            y[i] = y[firstKnown];

        var lastIdx = firstKnown;
        for (var i = firstKnown + 1; i < n; i++)
        {
            if (known[i])
            {
                lastIdx = i;
                continue;
            }

            var j = i;
            while (j < n && !known[j])
                j++;
            if (j >= n)
            {
                for (var k = i; k < n; k++)
                    y[k] = y[lastIdx];
                break;
            }

            var y0 = y[lastIdx];
            var y1 = y[j];
            var span = j - lastIdx;
            for (var k = i; k < j; k++)
                y[k] = y0 + (y1 - y0) * ((k - lastIdx) / (double)span);

            i = j;
            lastIdx = j;
        }

        return y;
    }

    private static double[] RollingMedianCentered(double[] x, int window)
    {
        var w = Math.Max(3, window | 1);
        var half = w / 2;
        var n = x.Length;
        var o = new double[n];
        for (var i = 0; i < n; i++)
        {
            var i0 = Math.Max(0, i - half);
            var i1 = Math.Min(n - 1, i + half);
            var sliceLen = i1 - i0 + 1;
            var buf = new double[sliceLen];
            Array.Copy(x, i0, buf, 0, sliceLen);
            Array.Sort(buf);
            o[i] = buf[sliceLen / 2];
        }

        return o;
    }
}
