using System.Collections.Concurrent;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Http.Connections.Client;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Rydo.Api.Data;

namespace Rydo.Api.Services.RideLive;

/// <summary>Opens one hub connection per configured bot user that is a participant on the ride.</summary>
public sealed class RideLiveBotOrchestrator(
    IServiceScopeFactory scopeFactory,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IOptions<DemoRideLiveBotsOptions> options,
    IHostEnvironment environment,
    IHostApplicationLifetime lifetime,
    ILogger<RideLiveBotOrchestrator> logger)
{
    private readonly ConcurrentDictionary<int, byte> _startedRides = new();

    public async Task TryStartBotsForRideAsync(int rideId, int triggeringUserId, string? triggeringEmail)
    {
        if (!environment.IsDevelopment() || !options.Value.Enabled)
        {
            logger.LogInformation(
                "Ride live bots: skip ride {RideId} — IsDevelopment={IsDev}, Rydo:DemoRideLiveBots:Enabled={Enabled}.",
                rideId,
                environment.IsDevelopment(),
                options.Value.Enabled);
            return;
        }

        if (!_startedRides.TryAdd(rideId, 0))
        {
            logger.LogInformation(
                "Ride live bots: skip ride {RideId} — orchestration already registered (another JoinRide won TryAdd; bots may already be running).",
                rideId);
            return;
        }

        var demoTrigger = IsDemoLobbyTrigger(triggeringEmail);
        logger.LogInformation(
            "Ride live bots: TryStart ride {RideId}, triggering user {UserId}, email {Email}, IsDemoLobbyTrigger={DemoTrigger}.",
            rideId,
            triggeringUserId,
            triggeringEmail ?? "(none)",
            demoTrigger);

        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<RydoDbContext>();
            var opt = options.Value;
            var emails = opt.BotEmails
                .Where(e => !string.IsNullOrWhiteSpace(e))
                .Select(e => e.Trim())
                .ToHashSet(StringComparer.OrdinalIgnoreCase);
            if (emails.Count == 0)
            {
                logger.LogWarning("Ride live bots: BotEmails empty in config; abort ride {RideId}.", rideId);
                _startedRides.TryRemove(rideId, out _);
                return;
            }

            if (demoTrigger)
            {
                await EnsureBotsAreParticipantsOnRideAsync(scope.ServiceProvider, rideId, opt, logger).ConfigureAwait(false);
                logger.LogInformation(
                    "Ride live bots: demo trigger {Email} (user {UserId}) ran EnsureBots for ride {RideId}.",
                    triggeringEmail,
                    triggeringUserId,
                    rideId);
            }
            else
            {
                logger.LogInformation(
                    "Ride live bots: email {Email} is not in TriggerEmails — bots are only auto-attached for trigger accounts; expecting bots to already be ride participants.",
                    triggeringEmail ?? "(none)");
            }

            var ride = await db.Rides.AsNoTracking()
                .Include(r => r.Route)
                .FirstOrDefaultAsync(r => r.Id == rideId);
            if (ride?.RouteId == null || ride.Route == null
                || string.IsNullOrWhiteSpace(ride.Route.PreviewCoordinatesJson)
                || ride.Route.PreviewCoordinatesJson == "[]")
            {
                logger.LogWarning(
                    "Ride live bots: abort ride {RideId} — missing route or preview polyline (RouteId={RouteId}, previewLen={PreviewLen}, previewEmpty={PreviewEmpty}).",
                    rideId,
                    ride?.RouteId,
                    ride?.Route?.PreviewCoordinatesJson?.Length ?? 0,
                    string.IsNullOrWhiteSpace(ride?.Route?.PreviewCoordinatesJson));
                _startedRides.TryRemove(rideId, out _);
                return;
            }

            var pts = RideLiveRouteSampler.ParsePreviewCoordinates(ride.Route.PreviewCoordinatesJson);
            if (pts.Count < 2)
            {
                logger.LogWarning(
                    "Ride live bots: abort ride {RideId} — preview parsed to {PointCount} point(s); need ≥2.",
                    rideId,
                    pts.Count);
                _startedRides.TryRemove(rideId, out _);
                return;
            }

            var participantIds = await db.RideParticipants.AsNoTracking()
                .Where(p => p.RideId == rideId)
                .Select(p => p.UserId)
                .ToListAsync();
            var participantUsers = await db.Users.AsNoTracking()
                .Where(u => participantIds.Contains(u.Id) && u.Email != null)
                .Select(u => new { u.Id, Email = u.Email! })
                .ToListAsync();
            // Filter in-memory so email matching uses OrdinalIgnoreCase (EF SQL IN can be collation-sensitive).
            var bots = participantUsers
                .Where(u => emails.Contains(u.Email))
                .Select(u => new { u.Id, u.Email })
                .ToList();
            logger.LogInformation(
                "Ride live bots: ride {RideId} — {ParticipantCount} participant(s) with email; {BotMatchCount} match BotEmails.",
                rideId,
                participantUsers.Count,
                bots.Count);
            if (bots.Count == 0)
            {
                if (demoTrigger)
                    logger.LogWarning(
                        "Ride live bots: no bot accounts on ride {RideId} after demo attach (check BotEmails vs AspNetUsers / RideParticipants).",
                        rideId);
                else
                    logger.LogInformation(
                        "Ride live bots: no configured bot participants on ride {RideId} — sign in as admin@rydo.test or user@rydo.test to auto-attach bots (TriggerEmails), or add bot users as participants.",
                        rideId);
                _startedRides.TryRemove(rideId, out _);
                return;
            }

            var selfBase = RideLiveSelfApiBaseUrl.Resolve(configuration, opt);
            logger.LogInformation(
                "Ride live bots: starting {BotCount} bot connection(s) for ride {RideId}; self API base (login/hub)={SelfBase}.",
                bots.Count,
                rideId,
                selfBase);

            using var shutdown = CancellationTokenSource.CreateLinkedTokenSource(lifetime.ApplicationStopping);
            var ct = shutdown.Token;
            var tasks = new List<Task>();
            for (var i = 0; i < bots.Count; i++)
            {
                var b = bots[i];
                var offsetIndex = i;
                tasks.Add(RunBotAsync(rideId, b.Email, b.Id, pts, offsetIndex, bots.Count, ct));
            }

            await Task.WhenAll(tasks).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Ride live bot fleet crashed for ride {RideId}", rideId);
            _startedRides.TryRemove(rideId, out _);
        }
    }

    private async Task RunBotAsync(
        int rideId,
        string email,
        int userId,
        List<(double Lng, double Lat)> pts,
        int botIndex,
        int botCount,
        CancellationToken ct)
    {
        var opt = options.Value;
        var http = httpClientFactory.CreateClient("RideLiveBots");
        string? token = null;
        try
        {
            using var loginRes = await http.PostAsJsonAsync(
                "api/auth/login",
                new { email, password = opt.BotPassword },
                ct).ConfigureAwait(false);
            if (!loginRes.IsSuccessStatusCode)
            {
                logger.LogWarning("Ride live bot login failed for {Email}: {Status}", email, loginRes.StatusCode);
                return;
            }

            await using var stream = await loginRes.Content.ReadAsStreamAsync(ct).ConfigureAwait(false);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct).ConfigureAwait(false);
            token = doc.RootElement.GetProperty("token").GetString();
            if (string.IsNullOrEmpty(token))
            {
                logger.LogWarning("Ride live bot login returned no token for {Email}", email);
                return;
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Ride live bot login error for {Email}", email);
            return;
        }

        var baseUrl = RideLiveSelfApiBaseUrl.Resolve(configuration, opt);
        var hubUrl = $"{baseUrl}/hubs/ride-live";
        await using var connection = new HubConnectionBuilder()
            .WithUrl(hubUrl, o =>
            {
                o.AccessTokenProvider = () => Task.FromResult<string?>(token);
            })
            .WithAutomaticReconnect()
            .Build();

        try
        {
            await connection.StartAsync(ct).ConfigureAwait(false);
            await connection.InvokeAsync("JoinRide", rideId, ct).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Ride live bot hub start/join failed for {Email} ride {RideId}", email, rideId);
            return;
        }

        var totalLen = 0.0;
        for (var i = 0; i < pts.Count - 1; i++)
            totalLen += HaversineQuick(pts[i].Lat, pts[i].Lng, pts[i + 1].Lat, pts[i + 1].Lng);
        if (totalLen < 1) totalLen = 1;

        var distanceAlong = totalLen * (botIndex + 1) / (botCount + 1);

        logger.LogInformation("Ride live bot {Email} running on ride {RideId}.", email, rideId);

        var poseSeq = 0;
        while (!ct.IsCancellationRequested)
        {
            try
            {
                var (lng, lat, bearing) = RideLiveRouteSampler.Advance(pts, ref distanceAlong, opt.StepMeters);
                var at = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ");
                await connection.InvokeAsync(
                    "UpdatePose",
                    lat,
                    lng,
                    bearing,
                    (double?)4,
                    at,
                    ct).ConfigureAwait(false);
                poseSeq++;
                if (poseSeq <= 3 || poseSeq % 20 == 0)
                {
                    logger.LogDebug(
                        "Ride live bot {Email} ride {RideId} UpdatePose invoked OK (#{Seq}) lat {Lat:F5} lng {Lng:F5}",
                        email,
                        rideId,
                        poseSeq,
                        lat,
                        lng);
                }
            }
            catch (Exception ex) when (ex is OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Ride live bot {Email} UpdatePose failed", email);
            }

            try
            {
                await Task.Delay(opt.UpdateIntervalMs, ct).ConfigureAwait(false);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }

        try
        {
            await connection.StopAsync(CancellationToken.None).ConfigureAwait(false);
        }
        catch
        {
            /* ignore */
        }
    }

    private static double HaversineQuick(double lat1, double lon1, double lat2, double lon2)
    {
        const double r = 6371000;
        var φ1 = lat1 * (Math.PI / 180);
        var φ2 = lat2 * (Math.PI / 180);
        var Δφ = (lat2 - lat1) * (Math.PI / 180);
        var Δλ = (lon2 - lon1) * (Math.PI / 180);
        var s1 = Math.Sin(Δφ / 2);
        var s2 = Math.Sin(Δλ / 2);
        var h = s1 * s1 + Math.Cos(φ1) * Math.Cos(φ2) * s2 * s2;
        return 2 * r * Math.Asin(Math.Min(1, Math.Sqrt(h)));
    }

    private bool IsDemoLobbyTrigger(string? email)
    {
        if (string.IsNullOrWhiteSpace(email)) return false;
        var e = email.Trim();
        foreach (var t in options.Value.TriggerEmails)
        {
            if (string.IsNullOrWhiteSpace(t)) continue;
            if (string.Equals(t.Trim(), e, StringComparison.OrdinalIgnoreCase))
                return true;
        }

        return false;
    }

    /// <summary>
    /// Ensures configured bot users exist and are club members (if needed) + ride participants for this ride.
    /// </summary>
    private static async Task EnsureBotsAreParticipantsOnRideAsync(
        IServiceProvider sp,
        int rideId,
        DemoRideLiveBotsOptions opt,
        ILogger<RideLiveBotOrchestrator> log)
    {
        var db = sp.GetRequiredService<RydoDbContext>();
        var userManager = sp.GetRequiredService<UserManager<ApplicationUser>>();
        var now = DateTime.UtcNow;

        var ride = await db.Rides.FirstOrDefaultAsync(r => r.Id == rideId).ConfigureAwait(false);
        if (ride == null)
        {
            log.LogWarning("Ride live bots EnsureBots: ride {RideId} not found.", rideId);
            return;
        }

        if (ride.RouteId == null)
        {
            log.LogWarning("Ride live bots EnsureBots: ride {RideId} has no RouteId; skip attach.", rideId);
            return;
        }

        if (ride.Kind == RideKind.SoloLog)
        {
            log.LogInformation("Ride live bots EnsureBots: ride {RideId} is SoloLog; skip bot participants.", rideId);
            return;
        }

        var botUsers = new List<ApplicationUser>();
        foreach (var raw in opt.BotEmails)
        {
            if (string.IsNullOrWhiteSpace(raw)) continue;
            var email = raw.Trim();
            var u = await userManager.FindByEmailAsync(email).ConfigureAwait(false);
            if (u == null)
            {
                var local = email.IndexOf('@') > 0 ? email[..email.IndexOf('@')] : "bot";
                u = new ApplicationUser
                {
                    UserName = email,
                    Email = email,
                    EmailConfirmed = true,
                    FirstName = "Live",
                    LastName = string.Join(" ", local.Split('.', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                        .Trim(),
                    CreatedAt = now,
                    AvatarUrl = $"https://api.dicebear.com/7.x/avataaars/svg?seed={Uri.EscapeDataString(email)}",
                    PublicAvatarUrl = true,
                };
                if (string.IsNullOrWhiteSpace(u.LastName))
                    u.LastName = "Bot";
                var created = await userManager.CreateAsync(u, opt.BotPassword).ConfigureAwait(false);
                if (!created.Succeeded)
                {
                    log.LogWarning(
                        "Ride live bots EnsureBots: CreateAsync failed for {Email}: {Errors}",
                        email,
                        string.Join("; ", created.Errors.Select(e => e.Description)));
                    continue;
                }

                await userManager.AddToRoleAsync(u, "user").ConfigureAwait(false);
                u = (await userManager.FindByEmailAsync(email).ConfigureAwait(false))!;
                log.LogInformation("Ride live bots EnsureBots: created bot user {Email} (id {UserId}).", email, u.Id);
            }

            botUsers.Add(u);
        }

        if (botUsers.Count == 0)
        {
            log.LogWarning("Ride live bots EnsureBots: no bot users resolved for ride {RideId}.", rideId);
            return;
        }

        if (ride.ClubId is int cid)
        {
            foreach (var bot in botUsers)
            {
                if (!await db.ClubMembers.AnyAsync(
                        m => m.ClubId == cid && m.UserId == bot.Id && m.MembershipStatus == ClubMembershipStatus.Active)
                    .ConfigureAwait(false))
                {
                    db.ClubMembers.Add(new ClubMember
                    {
                        ClubId = cid,
                        UserId = bot.Id,
                        Role = ClubMemberRole.Member,
                        MembershipStatus = ClubMembershipStatus.Active,
                        RequestedAt = now.AddDays(-7),
                        ActivatedAt = now.AddDays(-6),
                    });
                }
            }
        }

        foreach (var bot in botUsers)
        {
            if (!await db.RideParticipants.AnyAsync(p => p.RideId == rideId && p.UserId == bot.Id).ConfigureAwait(false))
                db.RideParticipants.Add(new RideParticipant { RideId = rideId, UserId = bot.Id });
        }

        await db.SaveChangesAsync().ConfigureAwait(false);

        var count = await db.RideParticipants.CountAsync(p => p.RideId == rideId).ConfigureAwait(false);
        log.LogInformation(
            "Ride live bots EnsureBots: saved ride {RideId} — {BotCount} bot user(s) ensured; total participants={TotalParticipants}.",
            rideId,
            botUsers.Count,
            count);
        if (ride.MaxParticipants < count)
        {
            ride.MaxParticipants = count;
            await db.SaveChangesAsync().ConfigureAwait(false);
        }
    }
}
