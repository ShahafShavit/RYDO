using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Rydo.Api.Services;

namespace Rydo.Api.Controllers;

[ApiController]
[Route("api/admin/analytics")]
[Authorize(Roles = "admin")]
public class AdminAnalyticsController(IAdminEngagementAnalyticsService analytics) : ControllerBase
{
    [HttpGet("engagement")]
    public async Task<IActionResult> Engagement(
        [FromQuery] int days = 7,
        [FromQuery] bool refresh = false,
        CancellationToken ct = default)
    {
        var result = await analytics.GetEngagementAsync(days, refresh, ct);
        return Ok(ToJson(result));
    }

    private static object ToJson(EngagementAnalyticsResult r) => new
    {
        asOfUtc = r.AsOfUtc.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
        cachedUntilUtc = r.CachedUntilUtc?.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
        dau = r.Dau,
        wau = r.Wau,
        mau = r.Mau,
        activeNow = r.ActiveNow,
        stickinessPct = r.StickinessPct,
        deltas = new
        {
            dauWoWPct = r.Deltas.DauWoWPct,
            wauWoWPct = r.Deltas.WauWoWPct,
            mauMoMPct = r.Deltas.MauMoMPct,
        },
        signups = new
        {
            today = r.Signups.Today,
            last7Days = r.Signups.Last7Days,
            last30Days = r.Signups.Last30Days,
        },
        returningActive30d = r.ReturningActive30d,
        newActive30d = r.NewActive30d,
        dailyActiveUsers = r.DailyActiveUsers.Select(d => new { date = d.Date, count = d.Count }),
        dailySignups = r.DailySignups.Select(d => new { date = d.Date, count = d.Count }),
        activityHeatmap = new
        {
            timeZone = r.ActivityHeatmap.TimeZone,
            days = r.ActivityHeatmap.Days,
            hours = r.ActivityHeatmap.Hours,
            values = r.ActivityHeatmap.Values,
        },
    };
}
