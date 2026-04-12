using System.Diagnostics;
using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;

namespace Rydo.Api.Data;

public static class DbSeeder
{
    public const string AdminEmail = "admin@rydo.test";
    public const string UserEmail = "user@rydo.test";
    public const string AdminPassword = "Admin123!";
    public const string UserPassword = "User123!";
    /// <summary>Password for bulk demo riders (rider003@ … rider036@rydo.test).</summary>
    public const string DemoRiderPassword = "User123!";

    public static async Task SeedAsync(IServiceProvider services)
    {
        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<RydoDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<int>>>();

        // Baseline roles + seeded logins must run even when demo history already exists; otherwise a DB can
        // contain History rows (e.g. partial seed / validation failure after history SaveChanges) while
        // AspNetUsers never got the admin — and the guard below would skip account creation forever.
        foreach (var name in new[] { "admin", "user" })
        {
            if (!await roleManager.RoleExistsAsync(name))
                await roleManager.CreateAsync(new IdentityRole<int> { Name = name, NormalizedName = name.ToUpperInvariant() });
        }

        ApplicationUser? admin = await userManager.FindByEmailAsync(AdminEmail);
        if (admin == null)
        {
            admin = new ApplicationUser
            {
                UserName = AdminEmail,
                Email = AdminEmail,
                EmailConfirmed = true,
                FirstName = "Sarah",
                LastName = "Admin",
                CreatedAt = DateTime.UtcNow,
                Bio = "Platform admin and route curator.",
                Location = "Tel Aviv",
                AvatarUrl = "https://api.dicebear.com/7.x/avataaars/svg?seed=sarahadmin",
                PublicEmail = false,
                PublicBio = true,
                PublicLocation = true,
                PublicAvatarUrl = true,
                PublicDefaultBikeType = true,
            };
            await userManager.CreateAsync(admin, AdminPassword);
            await userManager.AddToRoleAsync(admin, "admin");
        }

        ApplicationUser? rider = await userManager.FindByEmailAsync(UserEmail);
        if (rider == null)
        {
            rider = new ApplicationUser
            {
                UserName = UserEmail,
                Email = UserEmail,
                EmailConfirmed = true,
                FirstName = "John",
                LastName = "Rider",
                CreatedAt = DateTime.UtcNow,
                Bio = "Weekend gravel and long coffee stops.",
                Location = "Haifa",
                AvatarUrl = "https://api.dicebear.com/7.x/avataaars/svg?seed=johnrider",
                PublicAvatarUrl = true,
                PublicEmail = true,
                PublicBio = false,
                PublicLocation = true,
                PublicLastName = true,
                PublicDefaultBikeType = false,
            };
            await userManager.CreateAsync(rider, UserPassword);
            await userManager.AddToRoleAsync(rider, "user");
        }

        admin = await userManager.FindByEmailAsync(AdminEmail);
        rider = await userManager.FindByEmailAsync(UserEmail);
        if (admin == null || rider == null)
            return;

        // Completed seed includes history (saved in the same transaction as participants / challenges).
        // Changing SeedData/GpxSeed does not re-run this path on an existing DB; recreate the database (e.g. docker compose down -v) to apply updated seed assets.
        if (await db.HistoryEntries.AnyAsync())
        {
            await EnsureClubChatSeedAsync(db, rider.Id);
            return;
        }

        var allUsers = new List<ApplicationUser> { admin, rider };
        allUsers.AddRange(await SeedCommunityUsersAsync(userManager));

        var userIds = allUsers.Select(u => u.Id).ToList();
        var rnd = new Random(42);

        if (!await db.Routes.AnyAsync())
        {
            var hostEnv = scope.ServiceProvider.GetRequiredService<IHostEnvironment>();
            var gpxPool = LoadGpxSeedPool(hostEnv.ContentRootPath);
            var groopyRoutes = LoadGroopyRoutesFromSeed(hostEnv.ContentRootPath, allUsers, rnd);
            var syntheticRoutes = SeedSyntheticRoutes(allUsers, rnd, gpxPool);
            var routes = groopyRoutes.Concat(syntheticRoutes).ToList();
            db.Routes.AddRange(routes);
            await db.SaveChangesAsync();

            SeedSavedRoutes(db, routes, userIds, rnd);
            db.Hazards.AddRange(SeedHazards(allUsers, rnd));

            var clubs = SeedCyclingClubs(routes, allUsers);
            db.CyclingClubs.AddRange(clubs);
            await db.SaveChangesAsync();

            SeedClubMembersAndInvites(db, clubs, admin, rider, allUsers, rnd);

            var personalRideGroups = SeedPersonalRideGroups(routes, rnd, allUsers);
            var rideGroups = SeedRideGroups(db, routes, rnd, clubs).Concat(personalRideGroups).ToList();
            ApplyRideScheduleCaps(rideGroups, maxUpcomingTotal: 4, maxUpcomingPerClub: 2);
            db.Rides.AddRange(rideGroups);
            await db.SaveChangesAsync();

            await EnsureClubChatSeedAsync(db, rider.Id);

            await SeedActivityHistoryAndMetadataAsync(db, routes, rideGroups, personalRideGroups, userIds, rnd);
            return;
        }

        // Partial seed: e.g. app stopped after ride groups were saved but before the final SaveChanges for
        // participants + history — finish without duplicating routes/clubs.
        var routesFromDb = await db.Routes.AsNoTracking().ToListAsync();
        var rideGroupsFromDb = await db.Rides.ToListAsync();
        var personalFromDb = rideGroupsFromDb.Where(g => g.ClubId == null).ToList();
        await SeedActivityHistoryAndMetadataAsync(db, routesFromDb, rideGroupsFromDb, personalFromDb, userIds, rnd);
        await EnsureClubChatSeedAsync(db, rider.Id);
    }

    /// <summary>
    /// Inserts demo club chat for each club that has no messages yet and at least two active members.
    /// Idempotent per club (skips clubs that already have any message). The first eligible club gets a richer
    /// thread; others get a short demo line so members never see a blank thread after API restart.
    /// </summary>
    private static async Task EnsureClubChatSeedAsync(RydoDbContext db, int riderUserId)
    {
        var clubs = await db.CyclingClubs.AsNoTracking().OrderBy(c => c.Id).ToListAsync();
        if (clubs.Count == 0)
            return;

        var routes = await db.Routes.AsNoTracking().ToListAsync();
        if (routes.Count == 0)
            return;

        var rideGroups = await db.Rides.AsNoTracking().ToListAsync();
        var jsonOpts = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

        var seededRichThread = false;
        foreach (var club in clubs)
        {
            if (await db.ClubChatMessages.AsNoTracking().AnyAsync(m => m.ClubId == club.Id))
                continue;

            var memberIds = await db.ClubMembers.AsNoTracking()
                .Where(m => m.ClubId == club.Id && m.MembershipStatus == ClubMembershipStatus.Active)
                .OrderBy(m => m.UserId)
                .Select(m => m.UserId)
                .Take(8)
                .ToListAsync();

            if (memberIds.Count < 2)
                continue;

            if (!seededRichThread)
            {
                await SeedRichClubChatDemoAsync(db, club.Id, memberIds, routes, rideGroups, riderUserId, jsonOpts);
                seededRichThread = true;
            }
            else
            {
                var a = memberIds[0];
                var b = memberIds[1];
                db.ClubChatMessages.Add(new ClubChatMessage
                {
                    ClubId = club.Id,
                    AuthorUserId = a,
                    Body = "Who's in for next week?",
                    MentionsJson = JsonSerializer.Serialize(new[] { new { kind = "user", id = b } }, jsonOpts),
                    SentAt = DateTime.UtcNow.AddHours(-2),
                });
                await db.SaveChangesAsync();
            }
        }
    }

    private static async Task SeedRichClubChatDemoAsync(
        RydoDbContext db,
        int clubId,
        List<int> memberIds,
        List<RouteEntity> routes,
        List<Ride> rideGroups,
        int riderUserId,
        JsonSerializerOptions jsonOpts)
    {
        var u1 = memberIds[0];
        var u2 = memberIds[1];

        var savedRouteId = await db.SavedRoutes.AsNoTracking()
            .Where(s => s.UserId == u1)
            .Select(s => s.RouteId)
            .FirstOrDefaultAsync();

        if (savedRouteId == 0)
            savedRouteId = routes[0].Id;

        var routeEntity = routes.FirstOrDefault(r => r.Id == savedRouteId) ?? routes[0];
        savedRouteId = routeEntity.Id;

        var clubRide = rideGroups.FirstOrDefault(r => r.ClubId == clubId && r.Kind == RideKind.Scheduled);

        var messages = new List<ClubChatMessage>
        {
            new()
            {
                ClubId = clubId,
                AuthorUserId = u1,
                Body = "Hey — hope you can make Saturday's roll-out!",
                MentionsJson = JsonSerializer.Serialize(new[] { new { kind = "user", id = u2 } }, jsonOpts),
                SentAt = DateTime.UtcNow.AddHours(-5),
            },
            new()
            {
                ClubId = clubId,
                AuthorUserId = u2,
                Body = $"Saved route worth a look: {routeEntity.Title}",
                MentionsJson = JsonSerializer.Serialize(new[] { new { kind = "route", id = savedRouteId } }, jsonOpts),
                SentAt = DateTime.UtcNow.AddHours(-4),
            },
        };

        if (clubRide != null)
        {
            messages.Add(new ClubChatMessage
            {
                ClubId = clubId,
                AuthorUserId = u1,
                Body = "Don't forget this club ride — everyone welcome.",
                MentionsJson = JsonSerializer.Serialize(new[] { new { kind = "ride", id = clubRide.Id } }, jsonOpts),
                SentAt = DateTime.UtcNow.AddHours(-3),
            });
        }

        db.ClubChatMessages.AddRange(messages);
        await db.SaveChangesAsync();

        var demoReader = memberIds.Contains(riderUserId) ? riderUserId : u2;
        db.ClubChatReadStates.Add(new ClubChatReadState
        {
            ClubId = clubId,
            UserId = demoReader,
            LastReadMessageId = messages[0].Id,
        });
        await db.SaveChangesAsync();
    }

    private static async Task SeedActivityHistoryAndMetadataAsync(
        RydoDbContext db,
        IReadOnlyList<RouteEntity> routes,
        List<Ride> rideGroups,
        List<Ride> personalRideGroups,
        IReadOnlyList<int> userIds,
        Random rnd)
    {
        var (membersByClub, clubsByUser) = await LoadActiveMembershipMapsAsync(db);
        var fallbackClubId = await db.CyclingClubs.OrderBy(c => c.Id).Select(c => c.Id).FirstAsync();
        EnsureEveryUserHasActiveClubMembership(db, userIds, fallbackClubId, membersByClub, clubsByUser);
        await db.SaveChangesAsync();

        var rideIds = rideGroups.Select(r => r.Id).Distinct().ToArray();
        var partIndex = await ParticipantIndex.LoadExistingAsync(db, rideIds);

        SeedRideParticipants(db, rideGroups.Where(r => r.ClubId.HasValue).ToList(), membersByClub, partIndex);
        // Flush so LINQ against RideParticipants sees these rows (avoids duplicate composite keys in the change tracker).
        await db.SaveChangesAsync();

        EnsureAllUsersParticipantInSomeClubRide(db, rideGroups, userIds, clubsByUser, partIndex);
        SeedPersonalRideParticipants(db, personalRideGroups, userIds, partIndex);
        await db.SaveChangesAsync();

        EnsureAllUsersHaveFutureClubRideParticipation(db, rideGroups, userIds, clubsByUser, partIndex);
        EnsureMinimumRideParticipationsPerUser(db, rideGroups, userIds, 14, clubsByUser, partIndex);

        if (!await db.Challenges.AnyAsync())
            db.Challenges.AddRange(SeedChallenges(rnd));

        if (!await db.UserPreferences.AnyAsync())
            SeedUserPreferences(db, userIds);

        // Participant seeding must not increase the number of future-dated rides; enforce cap last.
        ApplyRideScheduleCaps(rideGroups, maxUpcomingTotal: 4, maxUpcomingPerClub: 2);

        await db.SaveChangesAsync();

        EnsureAllUsersHaveFutureClubRideParticipation(db, rideGroups, userIds, clubsByUser, partIndex);
        await db.SaveChangesAsync();

        await SeedHistoryAsync(db, routes.ToList(), userIds, personalRideGroups, partIndex);
        await db.SaveChangesAsync();

        await ValidateSeedDataCoherenceAsync(db);
    }

    private static async Task<(Dictionary<int, List<int>> membersByClub, Dictionary<int, List<int>> clubsByUser)> LoadActiveMembershipMapsAsync(
        RydoDbContext db,
        CancellationToken ct = default)
    {
        var rows = await db.ClubMembers.AsNoTracking()
            .Where(m => m.MembershipStatus == ClubMembershipStatus.Active)
            .Select(m => new { m.ClubId, m.UserId })
            .ToListAsync(ct);

        var membersByClub = rows.GroupBy(x => x.ClubId)
            .ToDictionary(g => g.Key, g => g.Select(x => x.UserId).OrderBy(u => u).ToList());
        var clubsByUser = rows.GroupBy(x => x.UserId)
            .ToDictionary(g => g.Key, g => g.Select(x => x.ClubId).OrderBy(c => c).ToList());
        return (membersByClub, clubsByUser);
    }

    /// <summary>
    /// Ensures every seeded user has at least one active club so club-ride demo data can stay API-consistent.
    /// </summary>
    private static void EnsureEveryUserHasActiveClubMembership(
        RydoDbContext db,
        IReadOnlyList<int> userIds,
        int fallbackClubId,
        Dictionary<int, List<int>> membersByClub,
        Dictionary<int, List<int>> clubsByUser)
    {
        foreach (var uid in userIds.OrderBy(u => u))
        {
            if (clubsByUser.ContainsKey(uid))
                continue;

            db.ClubMembers.Add(new ClubMember
            {
                ClubId = fallbackClubId,
                UserId = uid,
                Role = ClubMemberRole.Member,
                MembershipStatus = ClubMembershipStatus.Active,
                RequestedAt = DateTime.UtcNow.AddDays(-30),
                ActivatedAt = DateTime.UtcNow.AddDays(-29),
            });

            if (!membersByClub.TryGetValue(fallbackClubId, out var list))
            {
                list = [];
                membersByClub[fallbackClubId] = list;
            }

            list.Add(uid);
            list.Sort();
            clubsByUser[uid] = new List<int> { fallbackClubId };
        }
    }

    private static bool UserMayJoinClubRide(Ride ride, int userId, IReadOnlyDictionary<int, List<int>> clubsByUser) =>
        ride.ClubId is not int cid || (clubsByUser.TryGetValue(userId, out var c) && c.Contains(cid));

    private static async Task<List<ApplicationUser>> SeedCommunityUsersAsync(UserManager<ApplicationUser> userManager)
    {
        var list = new List<ApplicationUser>();
        var first = new[]
        {
            "Alex", "Noa", "David", "Maya", "Yoni", "Tamar", "Oren", "Shira", "Eitan", "Lior",
            "Nadav", "Roni", "Gal", "Amit", "Yuval", "Dana", "Itai", "Keren", "Bar", "Hila",
            "Roi", "Inbar", "Tom", "Stav", "Nitzan", "Alon", "Or", "Michal", "Erez", "Yael",
            "Ido", "Chen", "Reut", "Gil",
        };
        var last = new[]
        {
            "Cohen", "Levy", "Mizrahi", "Peretz", "Azoulay", "Biton", "Dahan", "Friedman", "Goldstein", "Katz",
            "Lavi", "Mor", "Nissan", "Ohana", "Pinto", "Rosen", "Segal", "Tal", "Weiss", "Yaron",
        };

        for (var i = 0; i < first.Length; i++)
        {
            var email = $"rider{(i + 3):000}@rydo.test";
            if (await userManager.FindByEmailAsync(email) != null)
                continue;

            var u = new ApplicationUser
            {
                UserName = email,
                Email = email,
                EmailConfirmed = true,
                FirstName = first[i],
                LastName = last[i % last.Length],
                CreatedAt = DateTime.UtcNow.AddDays(-(90 + i * 2)),
                Bio = $"Community rider — usually out on {(i % 2 == 0 ? "gravel" : "road")} at the weekend.",
                Location = i % 4 == 0 ? "Jerusalem" : i % 4 == 1 ? "Beer Sheva" : i % 4 == 2 ? "Netanya" : "Herzliya",
                AvatarUrl = $"https://api.dicebear.com/7.x/avataaars/svg?seed=rider{i + 3}",
                PublicEmail = i % 5 == 0,
                PublicBio = i % 3 != 1,
                PublicLocation = i % 7 != 0,
                PublicAvatarUrl = true,
                PublicFirstName = i % 11 != 0,
                PublicDefaultBikeType = i % 5 != 0,
            };
            var ok = await userManager.CreateAsync(u, DemoRiderPassword);
            if (ok.Succeeded)
            {
                await userManager.AddToRoleAsync(u, "user");
                list.Add(u);
            }
        }

        return list;
    }

    private static List<(string FileName, byte[] Bytes)> LoadGpxSeedPool(string contentRoot)
    {
        var dir = Path.Combine(contentRoot, "GpxSeed");
        if (!Directory.Exists(dir))
            return [];

        var list = new List<(string FileName, byte[] Bytes)>();
        foreach (var path in Directory.EnumerateFiles(dir, "*.gpx", SearchOption.TopDirectoryOnly))
        {
            try
            {
                var name = Path.GetFileName(path);
                var bytes = File.ReadAllBytes(path);
                if (bytes.Length == 0)
                    continue;
                if (!GpxTrackParser.IsTrackPlausible(bytes, out _))
                {
                    Debug.WriteLine($"[DbSeeder] Skipped implausible GPX seed file: {name}");
                    continue;
                }

                list.Add((name, bytes));
            }
            catch
            {
                // skip unreadable entries
            }
        }

        return list;
    }

    private static List<RouteEntity> LoadGroopyRoutesFromSeed(string contentRoot, IReadOnlyList<ApplicationUser> users, Random rnd)
    {
        var path = Path.Combine(contentRoot, "SeedData", "groopy-routes.json");
        if (!File.Exists(path))
            return [];

        List<GroopySeedDto> rows;
        try
        {
            var json = File.ReadAllText(path);
            rows = JsonSerializer.Deserialize<List<GroopySeedDto>>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? [];
        }
        catch
        {
            return [];
        }

        var list = new List<RouteEntity>();
        foreach (var row in rows)
        {
            if (string.IsNullOrWhiteSpace(row.GpxFileName))
                continue;

            var gpxPath = Path.Combine(contentRoot, "GpxSeed", row.GpxFileName);
            if (!File.Exists(gpxPath))
                continue;

            byte[] bytes;
            try
            {
                bytes = File.ReadAllBytes(gpxPath);
            }
            catch
            {
                continue;
            }

            if (bytes.Length == 0 || !GpxTrackParser.IsTrackPlausible(bytes, out _))
                continue;

            if (!GpxTrackParser.TryParse(bytes, out var previewJson, out var pathKm, out var pathElev, out var suggestedDur, out var derivedSrc, out var startLat, out var startLng))
                continue;

            var dist = pathKm > 0 ? pathKm : (row.LengthKm ?? 12);
            var elev = pathElev > 0 ? pathElev : (row.ElevationGainM ?? 0);
            if (pathElev <= 0 && row.ElevationGainM.HasValue && row.ElevationGainM.Value > 0)
                elev = row.ElevationGainM.Value;

            int dur;
            string durationSource;
            if (suggestedDur.HasValue)
            {
                dur = suggestedDur.Value;
                durationSource = derivedSrc;
            }
            else if (row.DurationMinutes.HasValue && row.DurationMinutes.Value > 0)
            {
                dur = row.DurationMinutes.Value;
                durationSource = RouteDurationSource.Estimated;
            }
            else
            {
                dur = Math.Max(1, (int)Math.Round(dist / GpxTrackParser.SuggestedDurationSpeedKmh * 60.0));
                durationSource = string.IsNullOrEmpty(derivedSrc) || derivedSrc == RouteDurationSource.Unknown
                    ? RouteDurationSource.EstimatedPace
                    : derivedSrc;
            }

            var creator = users[rnd.Next(users.Count)];
            var daysAgo = rnd.Next(2, 400);

            list.Add(new RouteEntity
            {
                Title = string.IsNullOrWhiteSpace(row.Title) ? $"Groopy {row.Pid}" : row.Title,
                Description = row.Description ?? "",
                Terrain = string.IsNullOrWhiteSpace(row.Terrain) ? "mixed" : row.Terrain!,
                Difficulty = string.IsNullOrWhiteSpace(row.Difficulty) ? "moderate" : row.Difficulty!,
                Region = string.IsNullOrWhiteSpace(row.Region) ? null : row.Region,
                StartLatitude = startLat,
                StartLongitude = startLng,
                DistanceKm = dist,
                ElevationGainM = Math.Round(elev, 0),
                EstimatedDurationMinutes = dur,
                EstimatedDurationSource = durationSource,
                WarningsJson = "[]",
                Notes = row.Notes,
                PreviewCoordinatesJson = previewJson,
                CreatedByUserId = creator.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-daysAgo),
                Status = "published",
                GpxReference = $"routes/{row.GpxFileName}",
                GpxBlob = bytes,
            });
        }

        return list;
    }

    private sealed class GroopySeedDto
    {
        public int Pid { get; set; }
        public string Title { get; set; } = "";
        public string? Region { get; set; }
        public string? Terrain { get; set; }
        public string? Difficulty { get; set; }
        public string? Description { get; set; }
        public double? LengthKm { get; set; }
        public double? ElevationGainM { get; set; }
        public int? DurationMinutes { get; set; }
        public string? GpxFileName { get; set; }
        public string? SourceUrl { get; set; }
        public string? Notes { get; set; }
    }

    private static List<RouteEntity> SeedSyntheticRoutes(IReadOnlyList<ApplicationUser> users, Random rnd, IReadOnlyList<(string FileName, byte[] Bytes)> gpxPool)
    {
        var regions = new[]
        {
            "Tel Aviv–Jaffa", "Haifa Bay", "Jerusalem Hills", "Negev Desert Route", "Golan Heights", "Dead Sea Loop",
            "Coastal Plain North", "Jezreel Valley", "Carmel Ridge", "Shfela Rolling Hills", "Galilee West", "Arava Trail",
        };
        var terrains = new[] { "road", "gravel", "trail", "mixed" };
        var difficulties = new[] { "casual", "moderate", "hard", "expert" };
        var titles = new[]
        {
            "Sunrise Coastal Sprint", "Friday Coffee Loop", "Hill Repeats — Mount Carmel", "Family Greenway",
            "Gravel Explorer: North Fields", "Jerusalem Ridge Classic", "Desert Dawn Empty Roads", "Harbour to Harbour",
            "Vineyard Ramble", "Lake Circuit Tempo", "Recovery Spin — Flat 40", "Weekend Metric Century",
            "After-work City Loop", "Mountain Pass Challenge", "Wadi Descent Technical", "Group Ride: Social Pace",
            "TT Practice — Out and Back", "Shabbat Morning Easy", "Night Ride — Lit Corridors", "Gran Fondo Prep Block",
            "Spring Classics Simulation", "Autumn Leaves Scenic", "Wind Training Laps", "Climb Series — Stage 3",
            "CX Skills Circuit", "Endurance Base — Zone 2", "Sprint City Blocks", "Rolling Hills Sweetspot",
            "Coastal Headwind Builder", "Forest Service Road Tour", "River Path Commuter", "Summit Seekers Loop",
            "Charity Ride Segment", "Club Championship Course", "Scenic Photo Stop Route", "Intervals — VO2 Ladder",
            "Long Slow Distance", "Brick Session Add-on", "Tourist Friendly Highlights", "Race Recon — Full Course",
            "Brevet Training Stretch", "Gravel & Espresso", "Sunset Return Leg", "Midweek Lunch Loop",
            "Weekend Escape — Two Counties", "Hilly Commute Alternative", "Quiet Side Roads Discovery",
            "Peloton Practice Rotating", "Solo Meditative Miles", "Night Ferry Return",
        };

        var routes = new List<RouteEntity>();
        var baseLat = 32.08;
        var baseLng = 34.78;

        IReadOnlyList<(string FileName, byte[] Bytes)> syntheticPool = gpxPool;
        if (gpxPool.Count > 0)
        {
            var withoutGroopy = gpxPool.Where(p => !p.FileName.StartsWith("groopy-", StringComparison.OrdinalIgnoreCase)).ToList();
            if (withoutGroopy.Count > 0)
                syntheticPool = withoutGroopy;
        }

        for (var i = 0; i < titles.Length; i++)
        {
            var creator = users[rnd.Next(users.Count)];
            var daysAgo = rnd.Next(2, 400);
            var dist = Math.Round(12 + rnd.NextDouble() * 95, 1);
            var elev = Math.Round(rnd.Next(80, 2200) + rnd.NextDouble() * 100);
            var dur = Math.Max(35, (int)(dist * 2.2 + rnd.Next(-15, 40)));
            var lat = baseLat + (rnd.NextDouble() - 0.5) * 0.45;
            var lng = baseLng + (rnd.NextDouble() - 0.5) * 0.55;
            var lat2 = lat + (rnd.NextDouble() - 0.5) * 0.02;
            var lng2 = lng + (rnd.NextDouble() - 0.5) * 0.02;

            var warnings = rnd.Next(5) == 0
                ? """["Busy traffic on weekends","Loose gravel after rain"]"""
                : rnd.Next(4) == 0 ? """["Cattle crossing possible"]""" : "[]";

            string previewJson = $"[[{lng:F5},{lat:F5}],[{lng2:F5},{lat2:F5}]]";
            string gpxRef = $"routes/seed-{i + 1}.gpx";
            byte[]? gpxBlob = null;
            var estimatedDurationSource = RouteDurationSource.Estimated;
            var routeStartLat = lat;
            var routeStartLng = lng;

            if (syntheticPool.Count > 0)
            {
                var pick = syntheticPool[rnd.Next(syntheticPool.Count)];
                gpxBlob = pick.Bytes;
                gpxRef = $"routes/{pick.FileName}";
                if (GpxTrackParser.TryParse(pick.Bytes, out var parsedPreview, out var pathKm, out var pathElev, out var suggestedDur, out var derivedSrc, out var seedStartLat, out var seedStartLng))
                {
                    previewJson = parsedPreview;
                    dist = pathKm;
                    if (pathElev > 0)
                        elev = pathElev;
                    estimatedDurationSource = derivedSrc;
                    // Match client upload: timestamps → minutes, else distance ÷ SuggestedDurationSpeedKmh (see GpxTrackParser).
                    dur = suggestedDur ?? Math.Max(1, (int)Math.Round(pathKm / GpxTrackParser.SuggestedDurationSpeedKmh * 60.0));
                    routeStartLat = seedStartLat;
                    routeStartLng = seedStartLng;
                }
            }

            routes.Add(new RouteEntity
            {
                Title = titles[i],
                Description = $"Popular loop in {regions[i % regions.Length]}. Distance ~{dist} km; good for {(difficulties[i % difficulties.Length] == "casual" ? "beginners" : "experienced riders")}.",
                Terrain = terrains[i % terrains.Length],
                Difficulty = difficulties[i % difficulties.Length],
                Region = regions[i % regions.Length],
                StartLatitude = routeStartLat,
                StartLongitude = routeStartLng,
                DistanceKm = dist,
                ElevationGainM = elev,
                EstimatedDurationMinutes = dur,
                EstimatedDurationSource = estimatedDurationSource,
                WarningsJson = warnings,
                PreviewCoordinatesJson = previewJson,
                CreatedByUserId = creator.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-daysAgo),
                Status = rnd.Next(12) == 0 ? "pending_review" : "published",
                GpxReference = gpxRef,
                GpxBlob = gpxBlob,
            });
        }

        return routes;
    }

    private static void SeedSavedRoutes(RydoDbContext db, List<RouteEntity> routes, IReadOnlyList<int> userIds, Random rnd)
    {
        const int minSavedPerUser = 6;
        var pairs = new HashSet<(int UserId, int RouteId)>();
        var perUser = userIds.ToDictionary(id => id, _ => 0);

        var target = Math.Min(280, Math.Max(routes.Count * userIds.Count / 2, userIds.Count * minSavedPerUser));
        for (var n = 0; n < target; n++)
        {
            var u = userIds[rnd.Next(userIds.Count)];
            var r = routes[rnd.Next(routes.Count)];
            if (!pairs.Add((u, r.Id)))
                continue;
            db.SavedRoutes.Add(new SavedRoute { UserId = u, RouteId = r.Id });
            perUser[u]++;
        }

        foreach (var uid in userIds)
        {
            var attempts = 0;
            while (perUser[uid] < minSavedPerUser && attempts < routes.Count * 4)
            {
                attempts++;
                var r = routes[rnd.Next(routes.Count)];
                if (!pairs.Add((uid, r.Id)))
                    continue;
                db.SavedRoutes.Add(new SavedRoute { UserId = uid, RouteId = r.Id });
                perUser[uid]++;
            }
        }
    }

    private static List<HazardEntity> SeedHazards(IReadOnlyList<ApplicationUser> users, Random rnd)
    {
        var types = new[] { "pothole", "construction", "debris", "flooding", "poor_lighting", "road_damage", "glass", "animals" };
        var severities = new[] { "low", "medium", "high" };
        var regions = new[] { "Tel Aviv–Jaffa", "Haifa", "Jerusalem", "Beer Sheva", "Netanya", "Ashdod", "Rishon", "Petah Tikva" };
        var statuses = new[] { "active", "active", "active", "active", "active", "resolved", "acknowledged" };

        var list = new List<HazardEntity>();
        var baseLat = 32.07;
        var baseLng = 34.76;

        for (var i = 0; i < 46; i++)
        {
            var reporter = users[rnd.Next(users.Count)];
            var status = statuses[rnd.Next(statuses.Length)];
            list.Add(new HazardEntity
            {
                Type = types[i % types.Length],
                Severity = severities[rnd.Next(severities.Length)],
                Description = DescribeHazard(types[i % types.Length], regions[i % regions.Length]),
                Latitude = baseLat + (rnd.NextDouble() - 0.5) * 0.5,
                Longitude = baseLng + (rnd.NextDouble() - 0.5) * 0.55,
                Region = regions[i % regions.Length],
                Status = status,
                ReportedByUserId = reporter.Id,
                ReportedAt = DateTime.UtcNow.AddDays(-rnd.Next(0, 180)),
            });
        }

        return list;
    }

    private static string DescribeHazard(string type, string region) =>
        type switch
        {
            "pothole" => $"Deep pothole reported near a junction in {region}.",
            "construction" => $"Lane reduction and heavy equipment in {region}; expect delays.",
            "debris" => $"Glass and debris on shoulder — {region} segment.",
            "flooding" => $"Standing water after rain; caution in {region}.",
            "poor_lighting" => $"Very dark underpass; use strong lights ({region}).",
            "road_damage" => $"Cracked surface and uneven asphalt in {region}.",
            "glass" => $"Shattered glass on bike lane in {region}.",
            "animals" => $"Stray dogs frequently cross; slow down ({region}).",
            _ => $"Hazard reported in {region}.",
        };

    private static List<CyclingClub> SeedCyclingClubs(List<RouteEntity> routes, IReadOnlyList<ApplicationUser> allUsers)
    {
        var region = routes[0].Region ?? "Israel";
        // Prefer community riders as founders so the graph is not anchored on Sarah (admin) and John.
        var creatorPool = allUsers
            .Where(u => u.Email != AdminEmail && u.Email != UserEmail)
            .OrderBy(u => u.Id)
            .ToList();
        if (creatorPool.Count == 0)
            creatorPool = allUsers.OrderBy(u => u.Id).ToList();

        var creatorIdx = 0;
        int NextCreatorId() => creatorPool[creatorIdx++ % creatorPool.Count].Id;

        return new List<CyclingClub>
        {
            new()
            {
                Name = "Coastal Open Rollers",
                Description = "Public club — all paces welcome along the coast.",
                Region = region,
                Visibility = ClubVisibility.Public,
                AvatarUrl = "https://api.dicebear.com/7.x/shapes/svg?seed=coastalOpenRollers",
                CreatedByUserId = NextCreatorId(),
                CreatedAt = DateTime.UtcNow.AddDays(-120),
            },
            new()
            {
                Name = "Jerusalem Hills Collective",
                Description = "Private club — request to join or use an invite.",
                Region = "Jerusalem Hills",
                Visibility = ClubVisibility.Private,
                AvatarUrl = "https://api.dicebear.com/7.x/shapes/svg?seed=jerusalemHillsCollective",
                CreatedByUserId = NextCreatorId(),
                CreatedAt = DateTime.UtcNow.AddDays(-90),
            },
            new()
            {
                Name = "Negev Dawn Patrol",
                Description = "Public weekend rides in the south.",
                Region = "Negev Desert Route",
                Visibility = ClubVisibility.Public,
                AvatarUrl = "https://api.dicebear.com/7.x/shapes/svg?seed=negevDawnPatrol",
                CreatedByUserId = NextCreatorId(),
                CreatedAt = DateTime.UtcNow.AddDays(-60),
            },
            new()
            {
                Name = "Corporate Wellness Riders",
                Description = "Private team club for organized lunch rides.",
                Region = "Tel Aviv–Jaffa",
                Visibility = ClubVisibility.Private,
                AvatarUrl = "https://api.dicebear.com/7.x/shapes/svg?seed=corporateWellnessRiders",
                CreatedByUserId = NextCreatorId(),
                CreatedAt = DateTime.UtcNow.AddDays(-30),
            },
            new()
            {
                Name = "Galilee Gravel Guild",
                Description = "Mixed-surface explorers — north routes, coffee stops, and mud.",
                Region = "Galilee West",
                Visibility = ClubVisibility.Public,
                AvatarUrl = "https://api.dicebear.com/7.x/shapes/svg?seed=galileeGravelGuild",
                CreatedByUserId = NextCreatorId(),
                CreatedAt = DateTime.UtcNow.AddDays(-110),
            },
            new()
            {
                Name = "Haifa Harbour Chain Gang",
                Description = "After-work spins and weekend tempo along the bay.",
                Region = "Haifa Bay",
                Visibility = ClubVisibility.Public,
                AvatarUrl = "https://api.dicebear.com/7.x/shapes/svg?seed=haifaHarbourChainGang",
                CreatedByUserId = NextCreatorId(),
                CreatedAt = DateTime.UtcNow.AddDays(-75),
            },
            new()
            {
                Name = "Carmel Ridge Race Lab",
                Description = "Private squad — structured intervals and race recon.",
                Region = "Carmel Ridge",
                Visibility = ClubVisibility.Private,
                AvatarUrl = "https://api.dicebear.com/7.x/shapes/svg?seed=carmelRidgeRaceLab",
                CreatedByUserId = NextCreatorId(),
                CreatedAt = DateTime.UtcNow.AddDays(-45),
            },
            new()
            {
                Name = "Jezreel Draft Train",
                Description = "Private — paceline practice and steady group rides.",
                Region = "Jezreel Valley",
                Visibility = ClubVisibility.Private,
                AvatarUrl = "https://api.dicebear.com/7.x/shapes/svg?seed=jezreelDraftTrain",
                CreatedByUserId = NextCreatorId(),
                CreatedAt = DateTime.UtcNow.AddDays(-55),
            },
            // Private clubs with **no** Sarah or John membership rows — discovery / “not my club” demos.
            new()
            {
                Name = "Arava Invite-Only Collective",
                Description = "Private club — community admins only in seed data.",
                Region = "Arava Trail",
                Visibility = ClubVisibility.Private,
                AvatarUrl = "https://api.dicebear.com/7.x/shapes/svg?seed=aravaInviteOnlyCollective",
                CreatedByUserId = NextCreatorId(),
                CreatedAt = DateTime.UtcNow.AddDays(-42),
            },
            new()
            {
                Name = "Dead Sea Dawn Private",
                Description = "Private — early starts; seed roster is community-only.",
                Region = "Dead Sea Loop",
                Visibility = ClubVisibility.Private,
                AvatarUrl = "https://api.dicebear.com/7.x/shapes/svg?seed=deadSeaDawnPrivate",
                CreatedByUserId = NextCreatorId(),
                CreatedAt = DateTime.UtcNow.AddDays(-38),
            },
        };
    }

    private static void SeedClubMembersAndInvites(
        RydoDbContext db,
        List<CyclingClub> clubs,
        ApplicationUser admin,
        ApplicationUser rider,
        List<ApplicationUser> allUsers,
        Random rnd)
    {
        var a = admin.Id;
        var r = rider.Id;
        var others = allUsers.Where(u => u.Id != a && u.Id != r).OrderBy(u => u.Id).ToList();
        var clubCount = clubs.Count;
        var adminSlots = clubCount * 2;
        if (others.Count < adminSlots)
            throw new InvalidOperationException($"Seed needs at least {adminSlots} community users for club admins; got {others.Count}.");

        // Extra riders distributed as members (not club admins) so Sarah & John are not the hub of every group.
        var memberPool = others.Skip(adminSlots).ToList();

        for (var i = 0; i < clubCount; i++)
        {
            var clubId = clubs[i].Id;
            var lead = others[i * 2];
            var co = others[i * 2 + 1];

            void AddMember(int userId, ClubMemberRole role, ClubMembershipStatus status, int daysBack)
            {
                var activated = status == ClubMembershipStatus.Active ? DateTime.UtcNow.AddDays(-daysBack) : (DateTime?)null;
                db.ClubMembers.Add(new ClubMember
                {
                    ClubId = clubId,
                    UserId = userId,
                    Role = role,
                    MembershipStatus = status,
                    RequestedAt = activated?.AddDays(-1) ?? DateTime.UtcNow.AddDays(-daysBack),
                    ActivatedAt = activated,
                });
            }

            AddMember(lead.Id, ClubMemberRole.Admin, ClubMembershipStatus.Active, 95 - i * 4);
            AddMember(co.Id, ClubMemberRole.Admin, ClubMembershipStatus.Active, 94 - i * 4);

            // 3–5 additional active members per club from the non-admin pool.
            var seenInClub = new HashSet<int> { lead.Id, co.Id };
            var extra = Math.Min(memberPool.Count, 4 + rnd.Next(0, 2));
            for (var j = 0; j < extra; j++)
            {
                var u = memberPool[(i * 5 + j) % memberPool.Count];
                if (!seenInClub.Add(u.Id)) continue;
                AddMember(u.Id, ClubMemberRole.Member, ClubMembershipStatus.Active, rnd.Next(5, 70));
            }
        }

        // Sarah: club admin on Coastal Open Rollers; member on a couple of others.
        if (clubCount > 0)
        {
            db.ClubMembers.Add(new ClubMember
            {
                ClubId = clubs[0].Id,
                UserId = a,
                Role = ClubMemberRole.Admin,
                MembershipStatus = ClubMembershipStatus.Active,
                RequestedAt = DateTime.UtcNow.AddDays(-101),
                ActivatedAt = DateTime.UtcNow.AddDays(-100),
            });
        }
        foreach (var idx in new[] { 3, 5 })
        {
            if (idx >= clubCount) continue;
            if (db.ClubMembers.Any(m => m.ClubId == clubs[idx].Id && m.UserId == a)) continue;
            db.ClubMembers.Add(new ClubMember
            {
                ClubId = clubs[idx].Id,
                UserId = a,
                Role = ClubMemberRole.Member,
                MembershipStatus = ClubMembershipStatus.Active,
                RequestedAt = DateTime.UtcNow.AddDays(-40),
                ActivatedAt = DateTime.UtcNow.AddDays(-39),
            });
        }

        // John: pending on Jerusalem Hills (demo); club admin on Negev Dawn Patrol; member on other clubs.
        var jerusalemId = clubs[1].Id;
        db.ClubMembers.Add(new ClubMember
        {
            ClubId = jerusalemId,
            UserId = r,
            Role = ClubMemberRole.Member,
            MembershipStatus = ClubMembershipStatus.Pending,
            RequestedAt = DateTime.UtcNow.AddDays(-2),
        });

        if (clubCount > 2)
        {
            db.ClubMembers.Add(new ClubMember
            {
                ClubId = clubs[2].Id,
                UserId = r,
                Role = ClubMemberRole.Admin,
                MembershipStatus = ClubMembershipStatus.Active,
                RequestedAt = DateTime.UtcNow.AddDays(-52),
                ActivatedAt = DateTime.UtcNow.AddDays(-50),
            });
        }

        foreach (var idx in new[] { 4, 6, 7 })
        {
            if (idx >= clubCount) continue;
            if (idx == 1) continue;
            if (db.ClubMembers.Any(m => m.ClubId == clubs[idx].Id && m.UserId == r)) continue;
            db.ClubMembers.Add(new ClubMember
            {
                ClubId = clubs[idx].Id,
                UserId = r,
                Role = ClubMemberRole.Member,
                MembershipStatus = ClubMembershipStatus.Active,
                RequestedAt = DateTime.UtcNow.AddDays(-rnd.Next(10, 55)),
                ActivatedAt = DateTime.UtcNow.AddDays(-rnd.Next(8, 50)),
            });
        }

        var jerusalemLead = others[2];
        db.ClubInvites.Add(new ClubInvite
        {
            ClubId = jerusalemId,
            Token = "seed-invite-jerusalem-hills-demo",
            CreatedByUserId = jerusalemLead.Id,
            CreatedAt = DateTime.UtcNow.AddDays(-5),
            MaxUses = 50,
            UsedCount = 0,
        });
    }

    private static void ApplyRideScheduleCaps(IList<Ride> groups, int maxUpcomingTotal, int maxUpcomingPerClub)
    {
        CapUpcomingRideGroups(groups, maxUpcomingTotal);
        CapFutureClubRidesPerClub(groups, maxUpcomingPerClub);
    }

    /// <summary>
    /// Keeps total upcoming (scheduled in the future) club + personal rides at or below the cap.
    /// </summary>
    private static void CapUpcomingRideGroups(IList<Ride> groups, int maxUpcoming)
    {
        var now = DateTime.UtcNow;
        var future = groups.Where(g => g.ScheduledDate >= now).OrderBy(g => g.ScheduledDate).ToList();
        for (var i = maxUpcoming; i < future.Count; i++)
        {
            var g = future[i];
            g.ScheduledDate = now.AddDays(-12 - (i - maxUpcoming)).Date.AddHours(10 + (i % 5));
        }
    }

    /// <summary>
    /// Pushes excess future-dated club rides into the past so each club has at most <paramref name="maxPerClub"/> upcoming.
    /// </summary>
    private static void CapFutureClubRidesPerClub(IList<Ride> groups, int maxPerClub)
    {
        var now = DateTime.UtcNow;
        var clubIds = groups.Where(g => g.ClubId.HasValue).Select(g => g.ClubId!.Value).Distinct();
        foreach (var cid in clubIds)
        {
            var futureForClub = groups
                .Where(g => g.ClubId == cid && g.ScheduledDate >= now)
                .OrderBy(g => g.ScheduledDate)
                .ToList();
            for (var i = maxPerClub; i < futureForClub.Count; i++)
            {
                var g = futureForClub[i];
                g.ScheduledDate = now.AddDays(-14 - (i - maxPerClub)).Date.AddHours(10 + (i % 5));
            }
        }
    }

    private static List<Ride> SeedRideGroups(
        RydoDbContext db,
        List<RouteEntity> routes,
        Random rnd,
        List<CyclingClub> clubs)
    {
        var names = new[]
        {
            "Friday Sunrise Crew", "Haifa Harbour Rollers", "TLV Coffee & Cadence", "Jerusalem Hill Camp",
            "Negev Empty Road Society", "Metric Century Club", "Beginner Friendly Pod", "Women's Wednesday Roll",
            "Gravel Curious Gang", "Corporate Wellness Lap", "Night Owls Urban", "Shabbat Easy Roll",
            "Youth Academy Spin", "Masters Race Prep", "Charity Training Block",
            "Coastal Draft Line", "Hill Repeats Pod", "Recovery Coffee Roll", "Aero Tuesday",
            "Fondo Training Block", "Criterium Practice", "Family Fun Pedal",
        };

        int CreatorForClub(int clubId)
        {
            var id = db.ClubMembers.Local
                .Where(m => m.ClubId == clubId && m.MembershipStatus == ClubMembershipStatus.Active)
                .OrderBy(m => m.UserId)
                .Select(m => m.UserId)
                .FirstOrDefault();
            if (id == 0)
                throw new InvalidOperationException($"Seed: no active club member for club id {clubId}.");
            return id;
        }

        var now = DateTime.UtcNow;
        const int upcomingClub = 3;
        var pastCount = names.Length - upcomingClub;

        var list = new List<Ride>();
        for (var i = 0; i < names.Length; i++)
        {
            var route = routes[rnd.Next(routes.Count)];
            DateTime scheduled;
            if (i < pastCount)
            {
                scheduled = now.AddDays(-(8 + rnd.Next(1, 380))).Date.AddHours(6 + rnd.Next(0, 12));
            }
            else
            {
                var u = i - pastCount;
                scheduled = now.AddDays(5 + u * 6).Date.AddHours(6 + rnd.Next(0, 12));
            }

            var clubId = clubs[i % clubs.Count].Id;
            var rg = new Ride
            {
                Kind = RideKind.Scheduled,
                Name = names[i],
                Description = $"Open group ride — {route.Region ?? "mixed terrain"}. Respect traffic rules.",
                ScheduledDate = scheduled,
                RouteId = route.Id,
                MaxParticipants = 8 + rnd.Next(0, 25),
                CreatedByUserId = CreatorForClub(clubId),
            };
            rg.ClubId = clubId;
            list.Add(rg);
        }

        return list;
    }

    private static List<Ride> SeedPersonalRideGroups(List<RouteEntity> routes, Random rnd, IReadOnlyList<ApplicationUser> users)
    {
        var now = DateTime.UtcNow;
        var pick = () => routes[rnd.Next(routes.Count)];
        var org = () => users[rnd.Next(users.Count)].Id;
        return new List<Ride>
        {
            new()
            {
                Kind = RideKind.Scheduled,
                Name = "Solo sunrise spin",
                Description = "Personal ride — no club.",
                ScheduledDate = now.AddDays(-12).Date.AddHours(6.5),
                RouteId = pick().Id,
                MaxParticipants = 8,
                ClubId = null,
                CreatedByUserId = org(),
            },
            new()
            {
                Kind = RideKind.Scheduled,
                Name = "Weekend explorer (solo)",
                Description = "Self-paced loop.",
                ScheduledDate = now.AddDays(-3).Date.AddHours(8),
                RouteId = pick().Id,
                MaxParticipants = 6,
                ClubId = null,
                CreatedByUserId = org(),
            },
            new()
            {
                Kind = RideKind.Scheduled,
                Name = "Evening recovery roll",
                Description = "Easy solo spin.",
                ScheduledDate = now.AddDays(-20).Date.AddHours(18.75),
                RouteId = pick().Id,
                MaxParticipants = 10,
                ClubId = null,
                CreatedByUserId = org(),
            },
            new()
            {
                Kind = RideKind.Scheduled,
                Name = "Gravel sampler — personal",
                Description = "Testing mixed surfaces on your own.",
                ScheduledDate = now.AddDays(-8).Date.AddHours(9.5),
                RouteId = pick().Id,
                MaxParticipants = 6,
                ClubId = null,
                CreatedByUserId = org(),
            },
            new()
            {
                Kind = RideKind.Scheduled,
                Name = "Lunch loop — personal",
                Description = "Quick midday miles — route TBD.",
                ScheduledDate = now.AddDays(4).Date.AddHours(12.25),
                RouteId = null,
                MaxParticipants = 4,
                ClubId = null,
                CreatedByUserId = org(),
            },
            new()
            {
                Kind = RideKind.Scheduled,
                Name = "Midweek tempo (solo)",
                Description = "Personal midweek effort.",
                ScheduledDate = now.AddDays(9).Date.AddHours(17),
                RouteId = pick().Id,
                MaxParticipants = 8,
                ClubId = null,
                CreatedByUserId = org(),
            },
        };
    }

    /// <summary>Fills each personal ride with as many distinct users as fit (up to MaxParticipants).</summary>
    private static void SeedPersonalRideParticipants(
        RydoDbContext db,
        List<Ride> personalGroups,
        IReadOnlyList<int> userIds,
        ParticipantIndex partIndex)
    {
        var ordered = userIds.OrderBy(id => id).ToList();
        if (ordered.Count == 0)
            return;

        foreach (var g in personalGroups.OrderBy(g => g.Id))
        {
            var take = Math.Min(g.MaxParticipants, ordered.Count);
            var start = (g.Id * 7919) % ordered.Count;
            for (var i = 0; i < take; i++)
            {
                var uid = ordered[(start + i) % ordered.Count];
                if (!partIndex.Has(g.Id, uid))
                    partIndex.Add(db, g.Id, uid);
            }
        }
    }

    /// <summary>Ensures every user is on at least one club ride (so My rides / club flows always have data).</summary>
    private static void EnsureAllUsersParticipantInSomeClubRide(
        RydoDbContext db,
        List<Ride> allRides,
        IReadOnlyList<int> userIds,
        IReadOnlyDictionary<int, List<int>> clubsByUser,
        ParticipantIndex partIndex)
    {
        var now = DateTime.UtcNow;
        var clubRides = allRides.Where(r => r.ClubId.HasValue).OrderBy(r => r.Id).ToList();
        var clubRideIds = clubRides.Select(r => r.Id).ToHashSet();

        foreach (var uid in userIds.OrderBy(u => u))
        {
            if (!clubsByUser.TryGetValue(uid, out var myClubs) || myClubs.Count == 0)
                continue;
            if (partIndex.UserHasAnyParticipantOnRides(uid, clubRideIds))
                continue;

            var candidates = clubRides
                .Where(r => myClubs.Contains(r.ClubId!.Value))
                .OrderByDescending(r => r.ScheduledDate < now ? 1 : 0)
                .ThenBy(r => r.Id)
                .ToList();

            foreach (var ride in candidates)
            {
                if (partIndex.Has(ride.Id, uid))
                    break;
                var cnt = partIndex.CountForRide(ride.Id);
                if (cnt >= ride.MaxParticipants) continue;
                partIndex.Add(db, ride.Id, uid);
                break;
            }
        }

        foreach (var uid in userIds.OrderBy(u => u))
        {
            if (!clubsByUser.TryGetValue(uid, out var myClubs) || myClubs.Count == 0)
                continue;
            if (partIndex.UserHasAnyParticipantOnRides(uid, clubRideIds))
                continue;

            var ride = clubRides.Where(r => myClubs.Contains(r.ClubId!.Value)).OrderBy(r => r.Id).FirstOrDefault();
            if (ride == null) continue;
            if (partIndex.Has(ride.Id, uid))
                continue;
            ride.MaxParticipants = Math.Max(ride.MaxParticipants, partIndex.CountForRide(ride.Id) + 1);
            partIndex.Add(db, ride.Id, uid);
        }
    }

    /// <summary>Ensures every user is on at least one upcoming club ride (admin and demo rider included).</summary>
    private static void EnsureAllUsersHaveFutureClubRideParticipation(
        RydoDbContext db,
        List<Ride> allRides,
        IReadOnlyList<int> userIds,
        IReadOnlyDictionary<int, List<int>> clubsByUser,
        ParticipantIndex partIndex)
    {
        var now = DateTime.UtcNow;

        List<Ride> FutureClubRides() => allRides
            .Where(r => r.ClubId.HasValue && r.ScheduledDate >= now)
            .OrderBy(r => r.ScheduledDate)
            .ThenBy(r => r.Id)
            .ToList();

        var futureClub = FutureClubRides();

        if (futureClub.Count == 0)
        {
            var anyClub = allRides.FirstOrDefault(r => r.ClubId.HasValue);
            if (anyClub == null) return;
            anyClub.ScheduledDate = now.AddDays(14).Date.AddHours(8);
            futureClub = FutureClubRides();
        }

        void EnsureFutureRideExistsForUserClubs(IReadOnlyList<int> myClubs)
        {
            var eligible = futureClub.Where(r => myClubs.Contains(r.ClubId!.Value)).ToList();
            if (eligible.Count != 0)
                return;

            var promote = allRides
                .Where(r => r.ClubId.HasValue && myClubs.Contains(r.ClubId!.Value))
                .OrderByDescending(r => r.ScheduledDate)
                .FirstOrDefault();
            if (promote == null)
                return;
            promote.ScheduledDate = now.AddDays(10).Date.AddHours(8);
            futureClub = FutureClubRides();
        }

        foreach (var uid in userIds.OrderBy(u => u))
        {
            if (!clubsByUser.TryGetValue(uid, out var myClubs) || myClubs.Count == 0)
                continue;

            var futureIds = futureClub.Select(f => f.Id).ToHashSet();
            if (partIndex.UserHasAnyParticipantOnRides(uid, futureIds))
                continue;

            EnsureFutureRideExistsForUserClubs(myClubs);
            var eligible = futureClub.Where(r => myClubs.Contains(r.ClubId!.Value)).ToList();

            foreach (var ride in eligible)
            {
                var cnt = partIndex.CountForRide(ride.Id);
                if (cnt >= ride.MaxParticipants) continue;
                if (partIndex.Has(ride.Id, uid)) break;
                partIndex.Add(db, ride.Id, uid);
                break;
            }
        }

        foreach (var uid in userIds.OrderBy(u => u))
        {
            if (!clubsByUser.TryGetValue(uid, out var myClubs) || myClubs.Count == 0)
                continue;

            futureClub = FutureClubRides();
            var futureIds = futureClub.Select(f => f.Id).ToHashSet();
            if (partIndex.UserHasAnyParticipantOnRides(uid, futureIds))
                continue;

            EnsureFutureRideExistsForUserClubs(myClubs);
            futureClub = FutureClubRides();
            var eligible = futureClub.Where(r => myClubs.Contains(r.ClubId!.Value)).OrderBy(r => r.ScheduledDate).ThenBy(r => r.Id).ToList();
            var ride = eligible.FirstOrDefault();
            if (ride == null)
            {
                var any = allRides.Where(r => r.ClubId.HasValue && myClubs.Contains(r.ClubId!.Value)).OrderBy(r => r.Id).FirstOrDefault();
                if (any == null) continue;
                any.ScheduledDate = now.AddDays(12).Date.AddHours(8);
                futureClub = FutureClubRides();
                eligible = futureClub.Where(r => myClubs.Contains(r.ClubId!.Value)).OrderBy(r => r.ScheduledDate).ThenBy(r => r.Id).ToList();
                ride = eligible.FirstOrDefault();
            }

            if (ride == null) continue;

            ride.MaxParticipants = Math.Max(ride.MaxParticipants, partIndex.CountForRide(ride.Id) + 1);
            if (!partIndex.Has(ride.Id, uid))
                partIndex.Add(db, ride.Id, uid);
        }
    }

    /// <summary>
    /// Dashboard &quot;group rides joined&quot; counts all <see cref="RideParticipant"/> rows — ensure everyone has a healthy number.
    /// </summary>
    private static void EnsureMinimumRideParticipationsPerUser(
        RydoDbContext db,
        List<Ride> allRides,
        IReadOnlyList<int> userIds,
        int minimum,
        IReadOnlyDictionary<int, List<int>> clubsByUser,
        ParticipantIndex partIndex)
    {
        var orderedRides = allRides.OrderBy(r => r.Id).ToList();
        foreach (var uid in userIds.OrderBy(u => u))
        {
            var need = minimum - partIndex.TotalForUser(uid);
            if (need <= 0) continue;

            foreach (var ride in orderedRides)
            {
                if (need <= 0) break;
                if (!UserMayJoinClubRide(ride, uid, clubsByUser)) continue;
                if (partIndex.Has(ride.Id, uid)) continue;
                var cnt = partIndex.CountForRide(ride.Id);
                if (cnt >= ride.MaxParticipants) continue;
                partIndex.Add(db, ride.Id, uid);
                need--;
            }

            var offset = uid % Math.Max(1, orderedRides.Count);
            while (need > 0)
            {
                var progressed = false;
                for (var step = 0; step < orderedRides.Count && need > 0; step++)
                {
                    var ride = orderedRides[(offset + step) % orderedRides.Count];
                    if (!UserMayJoinClubRide(ride, uid, clubsByUser))
                        continue;
                    // Already on this ride — does not reduce `need`; must not set progressed (would spin forever
                    // when need > 0 but user is on every ride they may join, e.g. fewer than `minimum` joinable rides).
                    if (partIndex.Has(ride.Id, uid))
                        continue;

                    ride.MaxParticipants = Math.Max(ride.MaxParticipants, partIndex.CountForRide(ride.Id) + need);
                    partIndex.Add(db, ride.Id, uid);
                    need--;
                    progressed = true;
                }

                if (!progressed)
                    break;
            }
        }
    }

    private static void SeedRideParticipants(
        RydoDbContext db,
        List<Ride> rides,
        IReadOnlyDictionary<int, List<int>> membersByClub,
        ParticipantIndex partIndex)
    {
        var ridesByClub = rides
            .Where(r => r.ClubId.HasValue)
            .GroupBy(r => r.ClubId!.Value)
            .ToDictionary(g => g.Key, g => g.OrderBy(r => r.Id).ToList());

        foreach (var ride in rides.Where(r => r.ClubId.HasValue).OrderBy(r => r.Id))
        {
            var cid = ride.ClubId!.Value;
            if (!membersByClub.TryGetValue(cid, out var members) || members.Count == 0)
                continue;

            var idxInClub = ridesByClub[cid].FindIndex(r => r.Id == ride.Id);
            if (idxInClub < 0) idxInClub = 0;

            var k = Math.Min(members.Count, 3 + (Math.Abs(ride.Id * 17 + idxInClub * 3) % 10));
            var start = (ride.Id * 7919) % members.Count;
            for (var t = 0; t < k; t++)
            {
                var uid = members[(start + t) % members.Count];
                if (!partIndex.Has(ride.Id, uid))
                    partIndex.Add(db, ride.Id, uid);
            }
        }
    }

    private static List<ChallengeEntity> SeedChallenges(Random rnd)
    {
        var now = DateTime.UtcNow;
        return new List<ChallengeEntity>
        {
            new()
            {
                Title = "Spring Vertical Challenge",
                Description = "Accumulate 5,000 m elevation before summer.",
                TargetValue = 5000,
                CurrentValue = 3200 + rnd.Next(0, 400),
                Unit = "meters",
                StartDate = now.AddMonths(-2),
                EndDate = now.AddMonths(2),
                IsActive = true,
            },
            new()
            {
                Title = "Coastal Distance Month",
                Description = "Ride 400 km on coastal routes this month.",
                TargetValue = 400,
                CurrentValue = 210 + rnd.Next(0, 80),
                Unit = "km",
                StartDate = now.AddDays(-20),
                EndDate = now.AddDays(10),
                IsActive = true,
            },
            new()
            {
                Title = "Commuter Streak",
                Description = "12 commute days in 30 days.",
                TargetValue = 12,
                CurrentValue = 7,
                Unit = "days",
                StartDate = now.AddDays(-25),
                EndDate = now.AddDays(5),
                IsActive = true,
            },
            new()
            {
                Title = "Group Ride Social",
                Description = "Join 6 organized group rides.",
                TargetValue = 6,
                CurrentValue = 4,
                Unit = "rides",
                StartDate = now.AddMonths(-1),
                EndDate = now.AddMonths(1),
                IsActive = true,
            },
            new()
            {
                Title = "Winter Base (archived)",
                Description = "Legacy winter endurance target.",
                TargetValue = 800,
                CurrentValue = 800,
                Unit = "km",
                StartDate = now.AddMonths(-6),
                EndDate = now.AddMonths(-3),
                IsActive = false,
            },
        };
    }

    private static async Task SeedHistoryAsync(
        RydoDbContext db,
        List<RouteEntity> routes,
        IReadOnlyList<int> userIds,
        IReadOnlyList<Ride> personalRideGroups,
        ParticipantIndex partIndex)
    {
        if (routes.Count == 0 || userIds.Count == 0)
            return;

        var soloRides = new List<Ride>();
        var soloMeta = new List<(RouteEntity Route, int UserId, DateTime CompletedAt, bool Sparse, int Dur)>();
        for (var n = 0; n < 175; n++)
        {
            var route = routes[n % routes.Count];
            var userId = userIds[n % userIds.Count];
            var daysAgo = 1 + n * 47 % 499;
            var completedAt = DateTime.UtcNow.AddDays(-daysAgo);
            var sparse = n % 11 == 0;
            var durJitter = n % 41 - 20;
            var dur = Math.Max(25, route.EstimatedDurationMinutes + durJitter);
            soloMeta.Add((route, userId, completedAt, sparse, dur));
            soloRides.Add(new Ride
            {
                Kind = RideKind.SoloLog,
                Name = $"{route.Title} — logged",
                Description = "Solo ride log.",
                ScheduledDate = completedAt,
                RouteId = route.Id,
                MaxParticipants = 1,
                ClubId = null,
                CreatedByUserId = userId,
            });
        }

        db.Rides.AddRange(soloRides);
        await db.SaveChangesAsync();

        for (var n = 0; n < soloRides.Count; n++)
        {
            var ride = soloRides[n];
            var m = soloMeta[n];
            var distFactor = 0.92 + n % 13 * 0.01;
            var elevFactor = 0.9 + n % 17 * 0.01;
            partIndex.Add(db, ride.Id, m.UserId);
            db.HistoryEntries.Add(new HistoryEntry
            {
                UserId = m.UserId,
                RouteId = m.Route.Id,
                RouteTitle = m.Route.Title,
                CompletedAt = m.CompletedAt,
                DurationMinutes = m.Sparse ? null : m.Dur,
                DistanceKm = m.Sparse ? null : Math.Round(m.Route.DistanceKm * distFactor, 1),
                ElevationGainM = m.Sparse ? null : Math.Round(m.Route.ElevationGainM * elevFactor, 1),
                RideId = ride.Id,
            });
        }

        var now = DateTime.UtcNow;
        foreach (var g in personalRideGroups.Where(x => x.ScheduledDate < now && x.RouteId.HasValue).OrderBy(x => x.Id))
        {
            var route = routes.First(r => r.Id == g.RouteId!.Value);
            var participantIds = partIndex.GetUserIdsOnRideOrdered(g.Id);

            for (var pi = 0; pi < participantIds.Count; pi++)
            {
                var uid = participantIds[pi];
                var dur = Math.Max(25, route.EstimatedDurationMinutes + pi % 21 - 10);
                var distFactor = 0.94 + pi % 11 * 0.01;
                var elevFactor = 0.92 + pi % 9 * 0.01;
                db.HistoryEntries.Add(new HistoryEntry
                {
                    UserId = uid,
                    RouteId = route.Id,
                    RouteTitle = route.Title,
                    CompletedAt = g.ScheduledDate.AddHours(1) + TimeSpan.FromMinutes(pi * 3),
                    DurationMinutes = dur,
                    DistanceKm = Math.Round(route.DistanceKm * distFactor, 1),
                    ElevationGainM = Math.Round(route.ElevationGainM * elevFactor, 1),
                    RideId = g.Id,
                });
            }
        }
    }

    private static async Task ValidateSeedDataCoherenceAsync(RydoDbContext db, CancellationToken ct = default)
    {
        var activePairs = await db.ClubMembers.AsNoTracking()
            .Where(m => m.MembershipStatus == ClubMembershipStatus.Active)
            .Select(m => new { m.ClubId, m.UserId })
            .ToListAsync(ct);
        var activeSet = activePairs.Select(x => (x.ClubId, x.UserId)).ToHashSet();

        var clubParticipants = await (
            from p in db.RideParticipants.AsNoTracking()
            join r in db.Rides.AsNoTracking() on p.RideId equals r.Id
            where r.ClubId != null
            select new { p.UserId, ClubId = r.ClubId!.Value, r.ScheduledDate }
        ).ToListAsync(ct);

        foreach (var row in clubParticipants)
        {
            if (!activeSet.Contains((row.ClubId, row.UserId)))
                throw new InvalidOperationException(
                    $"Seed validation: user {row.UserId} is a participant on club {row.ClubId} without active membership.");
        }

        var historyRows = await (
            from h in db.HistoryEntries.AsNoTracking()
            join r in db.Rides.AsNoTracking() on h.RideId equals r.Id
            select new { h.UserId, h.RideId, r.Kind }
        ).ToListAsync(ct);

        var participantPairs = await db.RideParticipants.AsNoTracking()
            .Select(p => new { p.RideId, p.UserId })
            .ToListAsync(ct);
        var participantSet = participantPairs.Select(p => (p.RideId, p.UserId)).ToHashSet();

        foreach (var h in historyRows)
        {
            if (h.Kind == RideKind.SoloLog)
                continue;

            if (!participantSet.Contains((h.RideId, h.UserId)))
                throw new InvalidOperationException(
                    $"Seed validation: history entry for user {h.UserId} ride {h.RideId} has no matching participant.");
        }
    }

    private static void SeedUserPreferences(RydoDbContext db, IReadOnlyList<int> userIds)
    {
        // Keep in sync with client BIKE_TYPES (RidingPreferencesForm / bikeTypes.js)
        var bikes = new[] { "road", "mountain", "gravel", "hybrid", "electric", "touring", "city" };
        var units = new[] { "km", "mi" };
        var rnd = new Random(99);
        foreach (var uid in userIds)
        {
            db.UserPreferences.Add(new UserPreference
            {
                UserId = uid,
                DefaultBikeType = bikes[rnd.Next(bikes.Length)],
                DistanceUnit = units[rnd.Next(2)],
                NotificationsEnabled = rnd.Next(6) != 0,
                PublicInRouteRiderLists = rnd.Next(9) != 0,
                ColorScheme = "midnight",
            });
        }
    }
}
