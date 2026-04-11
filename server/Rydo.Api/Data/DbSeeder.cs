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

        if (await db.Roles.AnyAsync())
            return;

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
            };
            await userManager.CreateAsync(rider, UserPassword);
            await userManager.AddToRoleAsync(rider, "user");
        }

        admin = await userManager.FindByEmailAsync(AdminEmail);
        rider = await userManager.FindByEmailAsync(UserEmail);
        if (admin == null || rider == null)
            return;

        var allUsers = new List<ApplicationUser> { admin, rider };
        allUsers.AddRange(await SeedCommunityUsersAsync(userManager));

        var userIds = allUsers.Select(u => u.Id).ToList();
        var rnd = new Random(42);

        var hostEnv = scope.ServiceProvider.GetRequiredService<IHostEnvironment>();
        var gpxPool = LoadGpxSeedPool(hostEnv.ContentRootPath);

        var routes = SeedRoutes(allUsers, rnd, gpxPool);
        db.Routes.AddRange(routes);
        await db.SaveChangesAsync();

        SeedSavedRoutes(db, routes, userIds, rnd);
        db.Hazards.AddRange(SeedHazards(allUsers, rnd));
        var rideGroups = SeedRideGroups(routes, rnd);
        db.RideGroups.AddRange(rideGroups);
        await db.SaveChangesAsync();

        SeedRideParticipants(db, rideGroups, userIds, rnd);
        db.Challenges.AddRange(SeedChallenges(rnd));
        db.HistoryEntries.AddRange(SeedHistory(routes, userIds, rnd));
        SeedUserPreferences(db, userIds);

        await db.SaveChangesAsync();
    }

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
                if (bytes.Length > 0)
                    list.Add((name, bytes));
            }
            catch
            {
                // skip unreadable entries
            }
        }

        return list;
    }

    private static List<RouteEntity> SeedRoutes(IReadOnlyList<ApplicationUser> users, Random rnd, IReadOnlyList<(string FileName, byte[] Bytes)> gpxPool)
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

            string previewJson = $"[[{lat:F5},{lng:F5}],[{lat2:F5},{lng2:F5}]]";
            string gpxRef = $"routes/seed-{i + 1}.gpx";
            byte[]? gpxBlob = null;

            if (gpxPool.Count > 0)
            {
                var pick = gpxPool[rnd.Next(gpxPool.Count)];
                gpxBlob = pick.Bytes;
                gpxRef = $"routes/{pick.FileName}";
                if (GpxTrackParser.TryParse(pick.Bytes, out var parsedPreview, out var pathKm, out var pathElev))
                {
                    previewJson = parsedPreview;
                    dist = pathKm;
                    if (pathElev > 0)
                        elev = pathElev;
                    dur = Math.Max(25, (int)(dist * 3.2 + rnd.Next(-10, 25)));
                }
            }

            routes.Add(new RouteEntity
            {
                Title = titles[i],
                Description = $"Popular loop in {regions[i % regions.Length]}. Distance ~{dist} km; good for {(difficulties[i % difficulties.Length] == "casual" ? "beginners" : "experienced riders")}.",
                Terrain = terrains[i % terrains.Length],
                Difficulty = difficulties[i % difficulties.Length],
                Region = regions[i % regions.Length],
                DistanceKm = dist,
                ElevationGainM = elev,
                EstimatedDurationMinutes = dur,
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
        var pairs = new HashSet<(int UserId, int RouteId)>();
        var target = Math.Min(140, routes.Count * userIds.Count / 2);
        for (var n = 0; n < target; n++)
        {
            var u = userIds[rnd.Next(userIds.Count)];
            var r = routes[rnd.Next(routes.Count)];
            if (!pairs.Add((u, r.Id)))
                continue;
            db.SavedRoutes.Add(new SavedRoute { UserId = u, RouteId = r.Id });
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

    private static List<RideGroup> SeedRideGroups(List<RouteEntity> routes, Random rnd)
    {
        var names = new[]
        {
            "Friday Sunrise Crew", "Haifa Harbour Rollers", "TLV Coffee & Cadence", "Jerusalem Hill Camp",
            "Negev Empty Road Society", "Metric Century Club", "Beginner Friendly Pod", "Women's Wednesday Roll",
            "Gravel Curious Gang", "Corporate Wellness Lap", "Night Owls Urban", "Shabbat Easy Roll",
            "Youth Academy Spin", "Masters Race Prep", "Charity Training Block",
        };

        var list = new List<RideGroup>();
        for (var i = 0; i < names.Length; i++)
        {
            var route = routes[rnd.Next(routes.Count)];
            var days = rnd.Next(-10, 45);
            list.Add(new RideGroup
            {
                Name = names[i],
                Description = $"Open group ride — {route.Region ?? "mixed terrain"}. Respect traffic rules.",
                ScheduledDate = DateTime.UtcNow.AddDays(days).Date.AddHours(6 + rnd.Next(0, 12)),
                RouteId = route.Id,
                MaxParticipants = 8 + rnd.Next(0, 25),
            });
        }

        return list;
    }

    private static void SeedRideParticipants(RydoDbContext db, List<RideGroup> rides, IReadOnlyList<int> userIds, Random rnd)
    {
        foreach (var ride in rides)
        {
            var count = Math.Min(userIds.Count, 3 + rnd.Next(0, 12));
            var picked = userIds.OrderBy(_ => rnd.Next()).Take(count).ToList();
            foreach (var uid in picked)
                db.RideParticipants.Add(new RideParticipant { RideGroupId = ride.Id, UserId = uid });
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

    private static List<HistoryEntry> SeedHistory(List<RouteEntity> routes, IReadOnlyList<int> userIds, Random rnd)
    {
        var list = new List<HistoryEntry>();
        for (var n = 0; n < 180; n++)
        {
            var route = routes[rnd.Next(routes.Count)];
            var userId = userIds[rnd.Next(userIds.Count)];
            var daysAgo = rnd.Next(1, 500);
            var dur = Math.Max(25, route.EstimatedDurationMinutes + rnd.Next(-40, 40));
            list.Add(new HistoryEntry
            {
                UserId = userId,
                RouteId = route.Id,
                RouteTitle = route.Title,
                CompletedAt = DateTime.UtcNow.AddDays(-daysAgo),
                DurationMinutes = dur,
                DistanceKm = Math.Round(route.DistanceKm * (0.92 + rnd.NextDouble() * 0.12), 1),
                ElevationGainM = Math.Round(route.ElevationGainM * (0.9 + rnd.NextDouble() * 0.15)),
            });
        }

        return list;
    }

    private static void SeedUserPreferences(RydoDbContext db, IReadOnlyList<int> userIds)
    {
        var bikes = new[] { "road", "gravel", "mtb", "urban", "ebike" };
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
            });
        }
    }
}
