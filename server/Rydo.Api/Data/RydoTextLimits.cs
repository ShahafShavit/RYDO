namespace Rydo.Api.Data;

public static class RydoTextLimits
{
    public const int RideNameMaxLength = 40;
    public const int RouteTitleMaxLength = 40;

    public static string TrimAndClampRideName(string? value)
    {
        var trimmed = value?.Trim() ?? "";
        return trimmed.Length <= RideNameMaxLength ? trimmed : trimmed[..RideNameMaxLength];
    }

    public static string TrimAndClampRouteTitle(string? value)
    {
        var trimmed = value?.Trim() ?? "";
        return trimmed.Length <= RouteTitleMaxLength ? trimmed : trimmed[..RouteTitleMaxLength];
    }

    public static string? ValidateRideName(string? value, out string normalized)
    {
        normalized = value?.Trim() ?? "";
        if (normalized.Length == 0)
            return "name is required.";
        if (normalized.Length > RideNameMaxLength)
            return $"name must be at most {RideNameMaxLength} characters.";
        return null;
    }

    public static string? ValidateRouteTitle(string? value, out string normalized)
    {
        normalized = value?.Trim() ?? "";
        if (normalized.Length == 0)
            return "title is required.";
        if (normalized.Length > RouteTitleMaxLength)
            return $"title must be at most {RouteTitleMaxLength} characters.";
        return null;
    }
}
