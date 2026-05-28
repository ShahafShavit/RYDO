namespace Rydo.Api.Services.RideLive;

public sealed record RiderPoseDto(
    int UserId,
    string DisplayName,
    string? AvatarUrl,
    double Lat,
    double Lng,
    double? HeadingDeg,
    double? AccuracyM,
    string AtUtc,
    bool IsStale = false);

public static class RideLiveWire
{
    public static object Pose(RiderPoseDto r) => new
    {
        userId = r.UserId,
        displayName = r.DisplayName,
        avatarUrl = r.AvatarUrl,
        lat = r.Lat,
        lng = r.Lng,
        headingDeg = r.HeadingDeg,
        accuracyM = r.AccuracyM,
        atUtc = r.AtUtc,
        isStale = r.IsStale,
    };
}
