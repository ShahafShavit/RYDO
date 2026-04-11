using System.Diagnostics;
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

        var clubs = SeedCyclingClubs(routes, admin, rider, rnd);
        db.CyclingClubs.AddRange(clubs);
        await db.SaveChangesAsync();

        SeedClubMembersAndInvites(db, clubs, admin, rider, allUsers, rnd);

        var rideGroups = SeedRideGroups(routes, rnd, clubs);
        db.RideGroups.AddRange(rideGroups);
        await db.SaveChangesAsync();

        SeedRideParticipants(db, rideGroups, userIds, rnd);
        EnsureRiderOnFutureGroupRide(db, rideGroups, rider.Id, userIds, rnd);
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

            string previewJson = $"[[{lng:F5},{lat:F5}],[{lng2:F5},{lat2:F5}]]";
            string gpxRef = $"routes/seed-{i + 1}.gpx";
            byte[]? gpxBlob = null;
            var estimatedDurationSource = RouteDurationSource.Estimated;

            if (gpxPool.Count > 0)
            {
                var pick = gpxPool[rnd.Next(gpxPool.Count)];
                gpxBlob = pick.Bytes;
                gpxRef = $"routes/{pick.FileName}";
                if (GpxTrackParser.TryParse(pick.Bytes, out var parsedPreview, out var pathKm, out var pathElev, out var suggestedDur, out var derivedSrc))
                {
                    previewJson = parsedPreview;
                    dist = pathKm;
                    if (pathElev > 0)
                        elev = pathElev;
                    estimatedDurationSource = derivedSrc;
                    // Match client upload: timestamps → minutes, else distance ÷ SuggestedDurationSpeedKmh (see GpxTrackParser).
                    dur = suggestedDur ?? Math.Max(1, (int)Math.Round(pathKm / GpxTrackParser.SuggestedDurationSpeedKmh * 60.0));
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

    private static List<CyclingClub> SeedCyclingClubs(List<RouteEntity> routes, ApplicationUser admin, ApplicationUser rider, Random rnd)
    {
        var region = routes[0].Region ?? "Israel";
        return new List<CyclingClub>
        {
            new()
            {
                Name = "Coastal Open Rollers",
                Description = "Public club — all paces welcome along the coast.",
                Region = region,
                Visibility = ClubVisibility.Public,
                CreatedByUserId = admin.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-120),
            },
            new()
            {
                Name = "Jerusalem Hills Collective",
                Description = "Private club — request to join or use an invite.",
                Region = "Jerusalem Hills",
                Visibility = ClubVisibility.Private,
                CreatedByUserId = admin.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-90),
            },
            new()
            {
                Name = "Negev Dawn Patrol",
                Description = "Public weekend rides in the south.",
                Region = "Negev Desert Route",
                Visibility = ClubVisibility.Public,
                CreatedByUserId = rider.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-60),
            },
            new()
            {
                Name = "Corporate Wellness Riders",
                Description = "Private team club for organized lunch rides.",
                Region = "Tel Aviv–Jaffa",
                Visibility = ClubVisibility.Private,
                CreatedByUserId = admin.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-30),
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
        var others = allUsers.Where(u => u.Id != a && u.Id != r).ToList();

        // Club 0 — public, two admins (admin + rider), more members
        var c0 = clubs[0].Id;
        db.ClubMembers.Add(new ClubMember
        {
            ClubId = c0,
            UserId = a,
            Role = ClubMemberRole.Admin,
            MembershipStatus = ClubMembershipStatus.Active,
            RequestedAt = DateTime.UtcNow.AddDays(-100),
            ActivatedAt = DateTime.UtcNow.AddDays(-100),
        });
        db.ClubMembers.Add(new ClubMember
        {
            ClubId = c0,
            UserId = r,
            Role = ClubMemberRole.Admin,
            MembershipStatus = ClubMembershipStatus.Active,
            RequestedAt = DateTime.UtcNow.AddDays(-99),
            ActivatedAt = DateTime.UtcNow.AddDays(-99),
        });
        foreach (var u in others.Take(8))
        {
            db.ClubMembers.Add(new ClubMember
            {
                ClubId = c0,
                UserId = u.Id,
                Role = ClubMemberRole.Member,
                MembershipStatus = ClubMembershipStatus.Active,
                RequestedAt = DateTime.UtcNow.AddDays(-rnd.Next(1, 80)),
                ActivatedAt = DateTime.UtcNow.AddDays(-rnd.Next(1, 80)),
            });
        }

        // Club 1 — private, admin + another admin, rider pending, invite token
        var c1 = clubs[1].Id;
        var secondAdmin = others[0];
        db.ClubMembers.Add(new ClubMember
        {
            ClubId = c1,
            UserId = a,
            Role = ClubMemberRole.Admin,
            MembershipStatus = ClubMembershipStatus.Active,
            RequestedAt = DateTime.UtcNow.AddDays(-80),
            ActivatedAt = DateTime.UtcNow.AddDays(-80),
        });
        db.ClubMembers.Add(new ClubMember
        {
            ClubId = c1,
            UserId = secondAdmin.Id,
            Role = ClubMemberRole.Admin,
            MembershipStatus = ClubMembershipStatus.Active,
            RequestedAt = DateTime.UtcNow.AddDays(-79),
            ActivatedAt = DateTime.UtcNow.AddDays(-79),
        });
        db.ClubMembers.Add(new ClubMember
        {
            ClubId = c1,
            UserId = r,
            Role = ClubMemberRole.Member,
            MembershipStatus = ClubMembershipStatus.Pending,
            RequestedAt = DateTime.UtcNow.AddDays(-2),
        });
        db.ClubInvites.Add(new ClubInvite
        {
            ClubId = c1,
            Token = "seed-invite-jerusalem-hills-demo",
            CreatedByUserId = a,
            CreatedAt = DateTime.UtcNow.AddDays(-5),
            MaxUses = 50,
            UsedCount = 0,
        });

        // Club 2 — public, rider admin
        var c2 = clubs[2].Id;
        db.ClubMembers.Add(new ClubMember
        {
            ClubId = c2,
            UserId = r,
            Role = ClubMemberRole.Admin,
            MembershipStatus = ClubMembershipStatus.Active,
            RequestedAt = DateTime.UtcNow.AddDays(-50),
            ActivatedAt = DateTime.UtcNow.AddDays(-50),
        });
        db.ClubMembers.Add(new ClubMember
        {
            ClubId = c2,
            UserId = a,
            Role = ClubMemberRole.Admin,
            MembershipStatus = ClubMembershipStatus.Active,
            RequestedAt = DateTime.UtcNow.AddDays(-49),
            ActivatedAt = DateTime.UtcNow.AddDays(-49),
        });
        foreach (var u in others.Skip(2).Take(6))
        {
            db.ClubMembers.Add(new ClubMember
            {
                ClubId = c2,
                UserId = u.Id,
                Role = ClubMemberRole.Member,
                MembershipStatus = ClubMembershipStatus.Active,
                RequestedAt = DateTime.UtcNow.AddDays(-rnd.Next(1, 40)),
                ActivatedAt = DateTime.UtcNow.AddDays(-rnd.Next(1, 40)),
            });
        }

        // Club 3 — private, two admins
        var c3 = clubs[3].Id;
        db.ClubMembers.Add(new ClubMember
        {
            ClubId = c3,
            UserId = a,
            Role = ClubMemberRole.Admin,
            MembershipStatus = ClubMembershipStatus.Active,
            RequestedAt = DateTime.UtcNow.AddDays(-20),
            ActivatedAt = DateTime.UtcNow.AddDays(-20),
        });
        db.ClubMembers.Add(new ClubMember
        {
            ClubId = c3,
            UserId = others[1].Id,
            Role = ClubMemberRole.Admin,
            MembershipStatus = ClubMembershipStatus.Active,
            RequestedAt = DateTime.UtcNow.AddDays(-19),
            ActivatedAt = DateTime.UtcNow.AddDays(-19),
        });
    }

    private static List<RideGroup> SeedRideGroups(List<RouteEntity> routes, Random rnd, List<CyclingClub> clubs)
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
            var rg = new RideGroup
            {
                Name = names[i],
                Description = $"Open group ride — {route.Region ?? "mixed terrain"}. Respect traffic rules.",
                ScheduledDate = DateTime.UtcNow.AddDays(days).Date.AddHours(6 + rnd.Next(0, 12)),
                RouteId = route.Id,
                MaxParticipants = 8 + rnd.Next(0, 25),
            };
            rg.ClubId = clubs[i % clubs.Count].Id;
            list.Add(rg);
        }

        return list;
    }

    private static void EnsureRiderOnFutureGroupRide(
        RydoDbContext db,
        List<RideGroup> rides,
        int riderUserId,
        IReadOnlyList<int> userIds,
        Random rnd)
    {
        var now = DateTime.UtcNow;
        var future = rides.Where(r => r.ScheduledDate >= now).ToList();
        RideGroup target;
        if (future.Count == 0)
        {
            target = rides[rnd.Next(rides.Count)];
            target.ScheduledDate = now.AddDays(14).Date.AddHours(8);
        }
        else
            target = future.OrderBy(r => r.ScheduledDate).First();

        if (db.RideParticipants.Any(p => p.RideGroupId == target.Id && p.UserId == riderUserId))
            return;

        db.RideParticipants.Add(new RideParticipant { RideGroupId = target.Id, UserId = riderUserId });
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
