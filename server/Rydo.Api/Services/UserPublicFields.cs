using Rydo.Api.Data;

namespace Rydo.Api.Services;

public static class UserPublicFields
{
    /// <summary>Avatar URL only when the user allows public display and a URL is set (e.g. public profile page).</summary>
    public static string? PublicAvatarUrl(ApplicationUser? u) =>
        u is { PublicAvatarUrl: true, AvatarUrl: { Length: > 0 } url } ? url : null;

    /// <summary>
    /// Avatar for authenticated in-app lists (clubs, rides, directory search). Shows stored image when present;
    /// visibility on the public profile page is still controlled by <see cref="PublicAvatarUrl"/>.
    /// </summary>
    public static string? RosterAvatarUrl(ApplicationUser? u) =>
        u != null && !string.IsNullOrWhiteSpace(u.AvatarUrl) ? u.AvatarUrl.Trim() : null;
}
