using Rydo.Api.Data;

namespace Rydo.Api.Services;

public static class AvatarUrls
{
    public static string UserUploaded(int userId) => $"/api/media/users/{userId}/avatar";

    public static string ClubUploaded(int clubId) => $"/api/media/clubs/{clubId}/avatar";

    public static bool IsExternalHttpUrl(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return false;
        if (!Uri.TryCreate(s.Trim(), UriKind.Absolute, out var u)) return false;
        return u.Scheme == Uri.UriSchemeHttp || u.Scheme == Uri.UriSchemeHttps;
    }

    /// <summary>Client may echo the canonical uploaded-avatar path when saving without changing the image.</summary>
    public static bool MatchesUserUploadedPath(string t, int userId)
    {
        var trimmed = t.Trim();
        var canonical = UserUploaded(userId);
        if (string.Equals(trimmed, canonical, StringComparison.OrdinalIgnoreCase)) return true;
        if (Uri.TryCreate(trimmed, UriKind.Absolute, out var u)
            && string.Equals(u.AbsolutePath, canonical, StringComparison.OrdinalIgnoreCase))
            return true;
        return false;
    }

    public static bool MatchesClubUploadedPath(string t, int clubId)
    {
        var trimmed = t.Trim();
        var canonical = ClubUploaded(clubId);
        if (string.Equals(trimmed, canonical, StringComparison.OrdinalIgnoreCase)) return true;
        if (Uri.TryCreate(trimmed, UriKind.Absolute, out var u)
            && string.Equals(u.AbsolutePath, canonical, StringComparison.OrdinalIgnoreCase))
            return true;
        return false;
    }

    /// <summary>Uploaded blob wins; otherwise external <see cref="ApplicationUser.AvatarUrl"/>.</summary>
    public static string? ResolveUserDisplay(ApplicationUser? u)
    {
        if (u == null) return null;
        if (u.AvatarImageBytes is { Length: > 0 })
            return UserUploaded(u.Id);
        return string.IsNullOrWhiteSpace(u.AvatarUrl) ? null : u.AvatarUrl.Trim();
    }

    public static string? ResolveClubDisplay(CyclingClub? c) =>
        c == null ? null : ResolveClubDisplay(c.AvatarUrl, c.AvatarImageBytes, c.Id);

    /// <summary>When <paramref name="hasUploadedBlob"/> is true (DB column non-null), use media URL without loading bytes.</summary>
    public static string? ResolveClubDisplay(string? avatarUrl, bool hasUploadedBlob, int clubId)
    {
        if (hasUploadedBlob) return ClubUploaded(clubId);
        return string.IsNullOrWhiteSpace(avatarUrl) ? null : avatarUrl.Trim();
    }

    public static string? ResolveClubDisplay(string? avatarUrl, byte[]? avatarImageBytes, int clubId)
    {
        if (avatarImageBytes is { Length: > 0 }) return ClubUploaded(clubId);
        return string.IsNullOrWhiteSpace(avatarUrl) ? null : avatarUrl.Trim();
    }
}
