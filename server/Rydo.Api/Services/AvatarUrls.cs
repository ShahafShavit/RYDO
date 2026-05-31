using Rydo.Api.Data;

namespace Rydo.Api.Services;

public static class AvatarUrls
{
    public static string UserUploaded(string handle) => $"/api/media/users/{handle}/avatar";

    public static string UserUploaded(ApplicationUser u) => UserUploaded(u.Handle);

    public static string UserDefaultFromHandle(string handle)
    {
        var seed = handle.Trim().TrimStart('@');
        if (string.IsNullOrEmpty(seed)) return string.Empty;
        return $"https://api.dicebear.com/7.x/avataaars/svg?seed={Uri.EscapeDataString(seed)}";
    }

    public static string ClubUploaded(int clubId) => $"/api/media/clubs/{clubId}/avatar";

    public static string ClubDefaultFromSeed(string seed)
    {
        if (string.IsNullOrWhiteSpace(seed)) return string.Empty;
        return $"https://api.dicebear.com/7.x/shapes/svg?seed={Uri.EscapeDataString(seed.Trim())}";
    }

    public static string ClubDefaultSeedFromName(string name)
    {
        var parts = name.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length == 0) return "club";
        var sb = new System.Text.StringBuilder();
        for (var i = 0; i < parts.Length; i++)
        {
            var p = parts[i];
            if (p.Length == 0) continue;
            if (i == 0)
                sb.Append(char.ToLowerInvariant(p[0])).Append(p.AsSpan(1));
            else
            {
                sb.Append(char.ToUpperInvariant(p[0]));
                if (p.Length > 1)
                    sb.Append(p.AsSpan(1).ToString().ToLowerInvariant());
            }
        }
        return sb.Length > 0 ? sb.ToString() : "club";
    }

    public static string ResolveClubSeed(string? avatarSeed, string clubName, int clubId)
    {
        if (!string.IsNullOrWhiteSpace(avatarSeed)) return avatarSeed.Trim();
        var fromName = ClubDefaultSeedFromName(clubName);
        return string.IsNullOrEmpty(fromName) ? $"club{clubId}" : fromName;
    }

    public static bool IsValidClubAvatarSeed(string? seed)
    {
        if (string.IsNullOrWhiteSpace(seed)) return true;
        var t = seed.Trim();
        return t.Length <= 64 && t.All(c => !char.IsControl(c));
    }

    public static bool IsExternalHttpUrl(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return false;
        if (!Uri.TryCreate(s.Trim(), UriKind.Absolute, out var u)) return false;
        return u.Scheme == Uri.UriSchemeHttp || u.Scheme == Uri.UriSchemeHttps;
    }

    /// <summary>Client may echo the canonical uploaded-avatar path when saving without changing the image.</summary>
    public static bool MatchesUserUploadedPath(string t, ApplicationUser u)
    {
        var trimmed = t.Trim();
        var canonical = UserUploaded(u);
        if (string.Equals(trimmed, canonical, StringComparison.OrdinalIgnoreCase)) return true;
        if (Uri.TryCreate(trimmed, UriKind.Absolute, out var uUri)
            && string.Equals(uUri.AbsolutePath, canonical, StringComparison.OrdinalIgnoreCase))
            return true;
        return false;
    }

    /// <summary>Legacy numeric avatar paths from before handles (ignored for new uploads).</summary>
    public static bool MatchesUserUploadedPath(string t, int userId)
    {
        var trimmed = t.Trim();
        var canonical = $"/api/media/users/{userId}/avatar";
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

    /// <summary>Uploaded blob wins; otherwise a Dicebear avatar seeded from the user's handle.</summary>
    public static string? ResolveUserDisplay(ApplicationUser? u)
    {
        if (u == null) return null;
        if (u.AvatarImageBytes is { Length: > 0 })
            return UserUploaded(u);
        var seeded = UserDefaultFromHandle(u.Handle);
        return string.IsNullOrEmpty(seeded) ? null : seeded;
    }

    public static string? ResolveClubDisplay(CyclingClub? c) =>
        c == null ? null : ResolveClubDisplay(c.AvatarSeed, c.Name, c.AvatarImageBytes, c.Id);

    /// <summary>When <paramref name="hasUploadedBlob"/> is true (DB column non-null), use media URL without loading bytes.</summary>
    public static string? ResolveClubDisplay(string? avatarSeed, string clubName, bool hasUploadedBlob, int clubId)
    {
        if (hasUploadedBlob) return ClubUploaded(clubId);
        var seed = ResolveClubSeed(avatarSeed, clubName, clubId);
        var url = ClubDefaultFromSeed(seed);
        return string.IsNullOrEmpty(url) ? null : url;
    }

    public static string? ResolveClubDisplay(string? avatarSeed, string clubName, byte[]? avatarImageBytes, int clubId)
    {
        if (avatarImageBytes is { Length: > 0 }) return ClubUploaded(clubId);
        var seed = ResolveClubSeed(avatarSeed, clubName, clubId);
        var url = ClubDefaultFromSeed(seed);
        return string.IsNullOrEmpty(url) ? null : url;
    }
}
