namespace Rydo.Api.Services.RideLive;

public sealed record RiderPoseDto(
    int UserId,
    string DisplayName,
    string? AvatarUrl,
    double Lat,
    double Lng,
    double? HeadingDeg,
    double? AccuracyM,
    string AtUtc);
