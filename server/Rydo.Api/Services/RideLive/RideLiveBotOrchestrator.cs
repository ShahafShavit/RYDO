using System.Collections.Concurrent;
using System.Text.Json;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Rydo.Api.Data;

namespace Rydo.Api.Services.RideLive;

/// <summary>Opens hub connections as selected ride participants (dev-only) and streams UpdatePose along the route preview.</summary>
public sealed class RideLiveBotOrchestrator(
    IServiceScopeFactory scopeFactory,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IOptions<DemoRideLiveBotsOptions> options,
    IHostEnvironment environment,
    IHostApplicationLifetime lifetime,
    ILogger<RideLiveBotOrchestrator> logger)
{
    private static readonly HashSet<string> SimulatorExcludedEmails = new(StringComparer.OrdinalIgnoreCase)
    {
        DbSeeder.AdminEmail,
        DbSeeder.UserEmail,
    };

    private readonly ConcurrentDictionary<int, byte> _startedRides = new();

    public async Task TryStartBotsForRideAsync(int rideId, int triggeringUserId, string? triggeringEmail)
    {
        if (!environment.IsDevelopment() || !options.Value.Enabled)
        {
            logger.LogInformation(
                "Ride live simulators: skip ride {RideId} — IsDevelopment={IsDev}, Rydo:DemoRideLiveBots:Enabled={Enabled}.",
                rideId,
                environment.IsDevelopment(),
                options.Value.Enabled);
            return;
        }

        if (!_startedRides.TryAdd(rideId, 0))
        {
            logger.LogInformation(
                "Ride live simulators: skip ride {RideId} — orchestration already registered (another JoinRide won TryAdd; simulators may already be running).",
                rideId);
            return;
        }

        logger.LogInformation(
            "Ride live simulators: TryStart ride {RideId}, triggering user {UserId}, email {Email}.",
            rideId,
            triggeringUserId,
            triggeringEmail ?? "(none)");

        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<RydoDbContext>();
            var opt = options.Value;

            var ride = await db.Rides.AsNoTracking()
                .Include(r => r.Route)
                .FirstOrDefaultAsync(r => r.Id == rideId);
            if (ride?.RouteId == null || ride.Route == null
                || string.IsNullOrWhiteSpace(ride.Route.PreviewCoordinatesJson)
                || ride.Route.PreviewCoordinatesJson == "[]")
            {
                logger.LogWarning(
                    "Ride live simulators: abort ride {RideId} — missing route or preview polyline (RouteId={RouteId}, previewLen={PreviewLen}, previewEmpty={PreviewEmpty}).",
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
                    "Ride live simulators: abort ride {RideId} — preview parsed to {PointCount} point(s); need ≥2.",
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

            var sims = participantUsers
                .Where(u => !SimulatorExcludedEmails.Contains(u.Email))
                .Where(u => u.Id != triggeringUserId)
                .OrderBy(u => u.Id)
                .Take(3)
                .Select(u => new { u.Id, u.Email })
                .ToList();

            logger.LogInformation(
                "Ride live simulators: ride {RideId} — {ParticipantCount} participant(s) with email; {SimulatorCount} selected (excl. admin/user/trigger, max 3).",
                rideId,
                participantUsers.Count,
                sims.Count);

            if (sims.Count == 0)
            {
                logger.LogInformation(
                    "Ride live simulators: no eligible seeded participants on ride {RideId} to simulate (need other riders besides admin@ / user@ / joiner).",
                    rideId);
                _startedRides.TryRemove(rideId, out _);
                return;
            }

            var selfBase = RideLiveSelfApiBaseUrl.Resolve(configuration, opt);
            logger.LogInformation(
                "Ride live simulators: starting {Count} connection(s) for ride {RideId}; self API base (login/hub)={SelfBase}.",
                sims.Count,
                rideId,
                selfBase);

            using var shutdown = CancellationTokenSource.CreateLinkedTokenSource(lifetime.ApplicationStopping);
            var ct = shutdown.Token;
            var tasks = new List<Task>();
            for (var i = 0; i < sims.Count; i++)
            {
                var s = sims[i];
                var offsetIndex = i;
                tasks.Add(RunSimulatorAsync(rideId, s.Email, s.Id, pts, offsetIndex, sims.Count, ct));
            }

            await Task.WhenAll(tasks).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Ride live simulator fleet crashed for ride {RideId}", rideId);
            _startedRides.TryRemove(rideId, out _);
        }
    }

    private async Task RunSimulatorAsync(
        int rideId,
        string email,
        int userId,
        List<(double Lng, double Lat)> pts,
        int simIndex,
        int simCount,
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
                logger.LogWarning("Ride live simulator login failed for {Email}: {Status}", email, loginRes.StatusCode);
                return;
            }

            await using var stream = await loginRes.Content.ReadAsStreamAsync(ct).ConfigureAwait(false);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct).ConfigureAwait(false);
            token = doc.RootElement.GetProperty("token").GetString();
            if (string.IsNullOrEmpty(token))
            {
                logger.LogWarning("Ride live simulator login returned no token for {Email}", email);
                return;
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Ride live simulator login error for {Email}", email);
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
            logger.LogWarning(ex, "Ride live simulator hub start/join failed for {Email} ride {RideId}", email, rideId);
            return;
        }

        var totalLen = 0.0;
        for (var i = 0; i < pts.Count - 1; i++)
            totalLen += HaversineQuick(pts[i].Lat, pts[i].Lng, pts[i + 1].Lat, pts[i + 1].Lng);
        if (totalLen < 1) totalLen = 1;

        var distanceAlong = totalLen * (simIndex + 1) / (simCount + 1);

        logger.LogInformation("Ride live simulator {Email} running on ride {RideId}.", email, rideId);

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
                        "Ride live simulator {Email} ride {RideId} UpdatePose invoked OK (#{Seq}) lat {Lat:F5} lng {Lng:F5}",
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
                logger.LogWarning(ex, "Ride live simulator {Email} UpdatePose failed", email);
            }

            try
            {
                await Task.Delay(RideLiveTiming.PoseHeartbeatIntervalMs, ct).ConfigureAwait(false);
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
}
