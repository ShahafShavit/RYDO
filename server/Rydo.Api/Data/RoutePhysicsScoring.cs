namespace Rydo.Api.Data;

/// <summary>
/// Validates GPX the same way as route upload, then computes <see cref="RouteEntity.PhysicsDifficultyScore"/>.
/// </summary>
public static class RoutePhysicsScoring
{
    /// <summary>
    /// Returns true when <paramref name="gpxBytes"/> passes <see cref="GpxTrackParser.TryParse"/> and <see cref="GpxTrackParser.IsTrackPlausible"/>.
    /// When true, <paramref name="physicsScore"/> is set if intensity density could be computed; otherwise null.
    /// </summary>
    public static bool TryValidateAndScoreGpx(byte[] gpxBytes, out double? physicsScore, out string? problemDetail)
    {
        physicsScore = null;
        problemDetail = null;

        if (gpxBytes.Length == 0)
        {
            problemDetail = "gpxFile is empty.";
            return false;
        }

        if (!GpxTrackParser.TryParse(gpxBytes, out _, out _, out _, out _, out _, out _, out _))
        {
            problemDetail = "GPX must contain a readable track with at least two points.";
            return false;
        }

        if (!GpxTrackParser.IsTrackPlausible(gpxBytes, out var rejectReason))
        {
            problemDetail = rejectReason ?? "This GPX file failed validation.";
            return false;
        }

        if (RoutePhysicsDifficulty.TryComputeIntensityDensityJPerKm(gpxBytes, out var densityJPerKm))
        {
            var s = RoutePhysicsDifficulty.DensityToNotebookScaledScore(densityJPerKm);
            if (double.IsFinite(s))
                physicsScore = s;
        }

        return true;
    }
}
