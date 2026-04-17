using Rydo.Api.Data;

namespace Rydo.Api.Services;

public static class UserPublicFields
{
    /// <summary>Avatar URL only when the user allows public display (uploaded or external URL).</summary>
    public static string? PublicAvatarUrl(ApplicationUser? u) =>
        u is { PublicAvatarUrl: true } ? AvatarUrls.ResolveUserDisplay(u) : null;

    /// <summary>
    /// Avatar for authenticated in-app lists (clubs, rides, directory search). Shows stored image when present;
    /// visibility on the public profile page is still controlled by <see cref="PublicAvatarUrl"/>.
    /// </summary>
    public static string? RosterAvatarUrl(ApplicationUser? u) => AvatarUrls.ResolveUserDisplay(u);
}
