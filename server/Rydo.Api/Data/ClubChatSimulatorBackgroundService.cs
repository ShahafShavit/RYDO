using System.Collections.Concurrent;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Rydo.Api.Hubs;
using Rydo.Api.Services;

namespace Rydo.Api.Data;

/// <summary>
/// Development-only: inserts up to N automated club chat messages per club at staggered intervals.
/// Does not update <see cref="ClubChatReadState"/> for the synthetic author (avoids skewing demo unread counts).
/// In-memory schedule resets when the API process restarts.
/// </summary>
public sealed class ClubChatSimulatorBackgroundService(
    IServiceProvider services,
    IHubContext<ClubChatHub> hubContext,
    IHostEnvironment environment,
    IOptions<DemoClubChatSimulatorOptions> options,
    ILogger<ClubChatSimulatorBackgroundService> logger)
    : BackgroundService
{
    private static readonly string[] DemoBodies =
    [
        "Quick check-in — anyone riding this weekend?",
        "Weather looks decent. Might head out Saturday morning.",
        "I'm flexible on start time if others want a later roll-out.",
        "Tubeless riders: bring plugs — last route had glass.",
        "I'll post here if plans change last minute.",
        "Coffee after if we're back early enough?",
        "Keeping it social pace unless everyone wants to push.",
        "Forecast still shifting — I'll watch the thread Friday night.",
        "Anyone need a pump at the meet spot?",
        "Sounds good — see you out there.",
        "Legs are tired but I could use a short spin.",
        "I'll bail early if work runs late — will shout here.",
    ];

    private readonly ConcurrentDictionary<int, ClubSimState> _clubState = new();

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var opt = options.Value;
        if (!environment.IsDevelopment() || !opt.Enabled)
        {
            logger.LogInformation("Club chat simulator is not running (Development={Dev}, Enabled={Enabled}).",
                environment.IsDevelopment(), opt.Enabled);
            return;
        }

        var tick = TimeSpan.FromSeconds(Math.Max(5, opt.TickSeconds));
        var minSec = Math.Max(1, Math.Min(opt.MinIntervalSeconds, opt.MaxIntervalSeconds));
        var maxSec = Math.Max(minSec, opt.MaxIntervalSeconds);
        var cap = Math.Max(0, opt.MaxAutomatedMessagesPerClub);

        logger.LogInformation(
            "Club chat simulator started (tick {Tick}s, interval {Min}-{Max}s, max {Cap} messages/club).",
            tick.TotalSeconds, minSec, maxSec, cap);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunTickAsync(cap, minSec, maxSec, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Club chat simulator tick failed.");
            }

            try
            {
                await Task.Delay(tick, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
        }
    }

    private async Task RunTickAsync(int cap, int minSec, int maxSec, CancellationToken ct)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RydoDbContext>();
        var dtoFactory = scope.ServiceProvider.GetRequiredService<ClubChatMessageDtoFactory>();

        var clubIds = await db.ClubMembers.AsNoTracking()
            .Where(m => m.MembershipStatus == ClubMembershipStatus.Active)
            .GroupBy(m => m.ClubId)
            .Where(g => g.Count() >= 2)
            .Select(g => g.Key)
            .ToListAsync(ct);

        if (clubIds.Count == 0)
            return;

        foreach (var clubId in clubIds)
        {
            if (ct.IsCancellationRequested)
                break;

            var now = DateTimeOffset.UtcNow;
            var state = _clubState.GetOrAdd(clubId, id => new ClubSimState
            {
                NextDueUtc = now.Add(InitialStagger(id)),
            });

            if (state.AutomatedCount >= cap)
                continue;

            if (now < state.NextDueUtc)
                continue;

            var memberIds = await db.ClubMembers.AsNoTracking()
                .Where(m => m.ClubId == clubId && m.MembershipStatus == ClubMembershipStatus.Active)
                .Select(m => m.UserId)
                .ToListAsync(ct);

            if (memberIds.Count < 2)
                continue;

            var authorId = memberIds[Random.Shared.Next(memberIds.Count)];
            var body = DemoBodies[Random.Shared.Next(DemoBodies.Length)];

            var msg = new ClubChatMessage
            {
                ClubId = clubId,
                AuthorUserId = authorId,
                Body = body,
                MentionsJson = null,
                SentAt = DateTime.UtcNow,
            };
            db.ClubChatMessages.Add(msg);
            await db.SaveChangesAsync(ct);

            await db.Entry(msg).Reference(m => m.Author).LoadAsync(ct);
            var dto = await dtoFactory.BuildAsync(msg, ct);
            await hubContext.Clients.Group(ClubChatHub.ClubGroupName(clubId)).SendAsync("ReceiveMessage", dto, ct);

            state.AutomatedCount++;
            state.NextDueUtc = DateTimeOffset.UtcNow.Add(RandomInterval(clubId, minSec, maxSec));
        }
    }

    /// <summary>0–120 seconds so clubs don't all fire together on first tick.</summary>
    private static TimeSpan InitialStagger(int clubId)
    {
        var seconds = Math.Abs(clubId * 7919) % 121;
        return TimeSpan.FromSeconds(seconds);
    }

    private static TimeSpan RandomInterval(int clubId, int minSec, int maxSec)
    {
        var span = maxSec - minSec + 1;
        var baseSec = minSec + Random.Shared.Next(span);
        var jitter = Math.Abs(clubId * 65537) % 23;
        var total = Math.Min(maxSec, baseSec + jitter);
        return TimeSpan.FromSeconds(total);
    }

    private sealed class ClubSimState
    {
        public int AutomatedCount;
        public DateTimeOffset NextDueUtc;
    }
}
