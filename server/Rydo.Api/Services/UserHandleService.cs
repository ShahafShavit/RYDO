using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;

namespace Rydo.Api.Services;

public interface IUserHandleService
{
    string? Normalize(string? raw);
    string? Validate(string? normalized);
    Task<bool> IsAvailableAsync(string normalized, int? excludeUserId, CancellationToken ct = default);
    Task<ApplicationUser?> ResolveUserAsync(string handle, CancellationToken ct = default);
    Task<int?> ResolveUserIdAsync(string handle, CancellationToken ct = default);
}

public class UserHandleService(RydoDbContext db) : IUserHandleService
{
    private const int MinLength = 3;
    private const int MaxLength = 30;

    private static readonly HashSet<string> Reserved = new(StringComparer.OrdinalIgnoreCase)
    {
        "admin", "api", "users", "user", "routes", "route", "clubs", "club", "ride", "rides",
        "settings", "login", "register", "me", "inbox", "dashboard", "leaderboards", "search",
        "media", "auth", "account", "find-people", "not-found", "live", "timelapse", "hazards",
        "challenges", "handle-available",
    };

    public string? Normalize(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        var s = raw.Trim();
        if (s.StartsWith('@')) s = s[1..].Trim();
        if (s.Length == 0) return null;
        return s.ToLowerInvariant();
    }

    public string? Validate(string? normalized)
    {
        if (string.IsNullOrEmpty(normalized))
            return "Handle is required.";
        if (normalized.Length < MinLength)
            return $"Handle must be at least {MinLength} characters.";
        if (normalized.Length > MaxLength)
            return $"Handle must be at most {MaxLength} characters.";
        if (!char.IsLetter(normalized[0]))
            return "Handle must start with a letter.";
        foreach (var ch in normalized)
        {
            if (char.IsLetterOrDigit(ch)) continue;
            if (ch == '_') continue;
            return "Handle may only contain letters, numbers, and underscores.";
        }
        if (Reserved.Contains(normalized))
            return "That handle is reserved.";
        return null;
    }

    public async Task<bool> IsAvailableAsync(string normalized, int? excludeUserId, CancellationToken ct = default)
    {
        var q = db.Users.AsNoTracking().Where(u => u.Handle == normalized);
        if (excludeUserId is int id)
            q = q.Where(u => u.Id != id);
        return !await q.AnyAsync(ct);
    }

    public async Task<ApplicationUser?> ResolveUserAsync(string handle, CancellationToken ct = default)
    {
        var normalized = Normalize(handle);
        if (normalized == null) return null;
        return await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Handle == normalized, ct);
    }

    public async Task<int?> ResolveUserIdAsync(string handle, CancellationToken ct = default)
    {
        var user = await ResolveUserAsync(handle, ct);
        return user?.Id;
    }
}
