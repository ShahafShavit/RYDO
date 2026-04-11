using Rydo.Api.Data;

namespace Rydo.Api.Services;

/// <summary>
/// Single place for &quot;sparse overrides&quot; on <see cref="HistoryEntry"/> with fallback to <see cref="RouteEntity"/>.
/// </summary>
public static class HistoryMergeHelper
{
    public static int EffectiveDurationMinutes(HistoryEntry h, RouteEntity? route) =>
        h.DurationMinutes ?? route?.EstimatedDurationMinutes ?? 0;

    public static double EffectiveDistanceKm(HistoryEntry h, RouteEntity? route) =>
        h.DistanceKm ?? route?.DistanceKm ?? 0;

    public static double EffectiveElevationGainM(HistoryEntry h, RouteEntity? route) =>
        h.ElevationGainM ?? route?.ElevationGainM ?? 0;

    public static bool HasTrackGpxOrPreview(RouteEntity? route, HistoryEntry h) =>
        route?.GpxBlob != null
        || !string.IsNullOrWhiteSpace(route?.GpxReference)
        || (!string.IsNullOrWhiteSpace(route?.PreviewCoordinatesJson) && route.PreviewCoordinatesJson != "[]");

    /// <summary>
    /// Business rule: a row is a valid &quot;past&quot; completion when there is GPX or preview data
    /// and duration/distance can be resolved (stored or from route / inference pipeline).
    /// </summary>
    public static bool CanRepresentCompletedPastRide(RouteEntity? route, HistoryEntry h)
    {
        if (!HasTrackGpxOrPreview(route, h)) return false;
        var dur = EffectiveDurationMinutes(h, route);
        var dist = EffectiveDistanceKm(h, route);
        return dur > 0 && dist > 0;
    }
}
