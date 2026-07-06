using Rydo.Api.Data;

namespace Rydo.Api.Services.Hazards;

public static class HazardVisibility
{
    public static DateTime ExpiryCutoffUtc(DateTime? now = null) =>
        (now ?? DateTime.UtcNow).AddMonths(-HazardConstants.TtlMonths);

    public static bool IsVisible(HazardEntity h, DateTime? now = null)
    {
        if (!string.Equals(h.Status, HazardConstants.StatusActive, StringComparison.OrdinalIgnoreCase))
            return false;
        if (h.Score <= 0)
            return false;
        return h.ReportedAt.ToUniversalTime() >= ExpiryCutoffUtc(now);
    }

    public static IQueryable<HazardEntity> WhereVisible(IQueryable<HazardEntity> query, DateTime? now = null)
    {
        var cutoff = ExpiryCutoffUtc(now);
        return query.Where(h =>
            h.Status == HazardConstants.StatusActive
            && h.Score > 0
            && h.ReportedAt >= cutoff);
    }
}
