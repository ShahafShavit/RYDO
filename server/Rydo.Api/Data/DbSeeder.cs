using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Rydo.Api.Data;

/// <summary>
/// Database seed orchestration. Uses a layered graph (see <see cref="SeedGraph"/>) and
/// <see cref="DeterministicSeed"/> for all variation — no <see cref="System.Random"/>.
/// </summary>
public static class DbSeeder
{
    public const string AdminEmail = "admin@rydo.test";
    public const string UserEmail = "user@rydo.test";
    public const string AdminPassword = "Admin123!";
    public const string UserPassword = "User123!";
    /// <summary>Password for bulk demo riders (see <see cref="DbSeedProfile.CommunityRiderCount"/> / <see cref="DbSeedProfile.CommunityRiderEmailStartNumber"/>).</summary>
    public const string DemoRiderPassword = "User123!";

    private static readonly DbSeedProfile Profile = new();

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
            await EnsureDemoLoginClubMembershipsAsync(db, admin.Id, rider.Id);
            await EnsureClubChatSeedAsync(db, rider.Id);
            await SeedFriendInboxIfNeededAsync(db, userManager, admin, rider);
            return;
        }

        var allUsers = new List<ApplicationUser> { admin, rider };
        allUsers.AddRange(await SeedCommunityUsersAsync(userManager));

        var userIds = allUsers.Select(u => u.Id).ToList();
        var det = new DeterministicSeed(Profile.RandomSeed);

        if (!await db.Routes.AnyAsync())
        {
            var hostEnv = scope.ServiceProvider.GetRequiredService<IHostEnvironment>();
            var routes = LoadGroopyRoutesFromSeed(hostEnv.ContentRootPath, allUsers, det);
            if (routes.Count == 0)
            {
                throw new InvalidOperationException(
                    "Route seed produced zero routes. Ensure server/Rydo.Api/SeedData/groopy-routes.json and matching GPX files exist under GpxSeed/ (from the scraper folder run: npm run build:seed-json).");
            }

            db.Routes.AddRange(routes);
            await db.SaveChangesAsync();

            SeedSavedRoutes(db, routes, userIds, det);
            db.Hazards.AddRange(SeedHazards(allUsers, det));

            var clubs = SeedCyclingClubs(routes, allUsers);
            db.CyclingClubs.AddRange(clubs);
            await db.SaveChangesAsync();

            SeedClubMembersAndInvites(db, clubs, admin, rider, allUsers, det);

            var personalRideGroups = SeedPersonalRideGroups(routes, det, allUsers);
            var rideGroups = SeedRideGroups(db, routes, det, clubs).Concat(personalRideGroups).ToList();
            ApplyRideScheduleCaps(
                rideGroups,
                maxUpcomingTotal: Profile.Time.MaxUpcomingTotal,
                maxUpcomingPerClub: Profile.Time.MaxUpcomingPerClub);
            db.Rides.AddRange(rideGroups);
            await db.SaveChangesAsync();

            await EnsureDemoLoginClubMembershipsAsync(db, admin.Id, rider.Id);
            await EnsureClubChatSeedAsync(db, rider.Id);

            await SeedActivityHistoryAndMetadataAsync(db, routes, rideGroups, personalRideGroups, userIds, det);
            await SeedFriendInboxIfNeededAsync(db, userManager, admin, rider);
            return;
        }

        // Partial seed: e.g. app stopped after ride groups were saved but before the final SaveChanges for
        // participants + history — finish without duplicating routes/clubs.
        var routesFromDb = await db.Routes.AsNoTracking().ToListAsync();
        var rideGroupsFromDb = await db.Rides.ToListAsync();
        var personalFromDb = rideGroupsFromDb.Where(g => g.ClubId == null).ToList();
        await SeedActivityHistoryAndMetadataAsync(db, routesFromDb, rideGroupsFromDb, personalFromDb, userIds, det);
        await EnsureDemoLoginClubMembershipsAsync(db, admin.Id, rider.Id);
        await EnsureClubChatSeedAsync(db, rider.Id);
        await SeedFriendInboxIfNeededAsync(db, userManager, admin, rider);
    }

    /// <summary>
    /// Demo friendships and pending friend requests (with inbox rows). Idempotent: skips when any friend request already exists.
    /// </summary>
    private static async Task SeedFriendInboxIfNeededAsync(
        RydoDbContext db,
        UserManager<ApplicationUser> userManager,
        ApplicationUser admin,
        ApplicationUser rider)
    {
        if (await db.FriendRequests.AnyAsync() || await db.Friendships.AnyAsync())
            return;

        var community = await LoadOrderedCommunityUsersForFriendSeedAsync(userManager);
        var spec = Profile.FriendInbox;
        ApplicationUser? C(int index) =>
            (uint)index < (uint)community.Count ? community[index] : null;

        for (var req = 0; req < spec.MinimumCommunityUsersForSeed; req++)
        {
            if (C(req) == null)
                return;
        }

        var now = DateTime.UtcNow;

        void AddFriendship(int a, int b)
        {
            var lo = Math.Min(a, b);
            var hi = Math.Max(a, b);
            db.Friendships.Add(new Friendship
            {
                UserIdLower = lo,
                UserIdHigher = hi,
                CreatedAt = now.AddDays(-Profile.FriendshipCreatedDaysAgo),
            });
        }

        void AddPending(int fromId, int toId)
        {
            var fr = new FriendRequest
            {
                FromUserId = fromId,
                ToUserId = toId,
                Status = FriendRequestStatus.Pending,
                CreatedAt = now.AddDays(-Profile.FriendRequestCreatedDaysAgo),
            };
            db.FriendRequests.Add(fr);
            db.InboxItems.Add(new InboxItem
            {
                RecipientUserId = toId,
                Kind = InboxItemKind.FriendRequest,
                FriendRequest = fr,
                CreatedAt = now.AddDays(-Profile.FriendRequestCreatedDaysAgo),
            });
        }

        for (var p = 0; p < spec.AdjacentCommunityPairCount; p++)
        {
            var a = C(2 * p);
            var b = C(2 * p + 1);
            if (a == null || b == null)
                continue;
            AddFriendship(a.Id, b.Id);
        }

        if (spec.AdminBefriendsCommunityIndex is { } ai && C(ai) is { } adminFriend)
            AddFriendship(admin.Id, adminFriend.Id);

        if (spec.DemoRiderBefriendsCommunityIndex is { } di && C(di) is { } riderFriend)
            AddFriendship(rider.Id, riderFriend.Id);

        var cycle = spec.PendingRecipientCycle;
        if (cycle.Length > 0)
        {
            for (var i = 0; i < spec.PendingRequestCount; i++)
            {
                var from = C(spec.PendingFirstCommunityIndex + i);
                if (from == null)
                    continue;
                var toId = cycle[i % cycle.Length] switch
                {
                    FriendInboxPendingRecipient.Admin => admin.Id,
                    FriendInboxPendingRecipient.DemoRider => rider.Id,
                    _ => throw new InvalidOperationException($"Unknown {nameof(FriendInboxPendingRecipient)}."),
                };
                AddPending(from.Id, toId);
            }
        }

        await db.SaveChangesAsync();
    }

    /// <summary>
    /// Community riders in seed order: index <c>i</c> = email <c>rider{Start+i}</c>.
    /// </summary>
    private static async Task<List<ApplicationUser?>> LoadOrderedCommunityUsersForFriendSeedAsync(
        UserManager<ApplicationUser> userManager)
    {
        var list = new List<ApplicationUser?>(Profile.CommunityRiderCount);
        for (var i = 0; i < Profile.CommunityRiderCount; i++)
        {
            var n = Profile.CommunityRiderEmailStartNumber + i;
            list.Add(await userManager.FindByEmailAsync(Profile.CommunityRiderEmail(n)));
        }

        return list;
    }

    /// <summary>
    /// Ensures <c>admin@rydo.test</c> and <c>user@rydo.test</c> (John Rider) have the intended multi-club demo layout.
    /// Idempotent. Safe on existing DBs (e.g. after partial seed or drift) so chat + inbox demos keep stable anchors.
    /// Club <i>ordinal</i> is the <see cref="CyclingClub"/> row order by <see cref="CyclingClub.Id"/> (matches initial seed order).
    /// </summary>
    private static async Task EnsureDemoLoginClubMembershipsAsync(RydoDbContext db, int adminId, int demoRiderId)
    {
        var clubs = await db.CyclingClubs.AsNoTracking().OrderBy(c => c.Id).ToListAsync();
        if (clubs.Count == 0)
            return;

        var clubCount = clubs.Count;

        async Task TryAddAsync(int clubOrdinal, int userId, ClubMemberRole role, int daysActivatedAgo)
        {
            if (clubOrdinal < 0 || clubOrdinal >= clubCount)
                return;
            var clubId = clubs[clubOrdinal].Id;
            if (await db.ClubMembers.AnyAsync(m => m.ClubId == clubId && m.UserId == userId))
                return;

            var activated = DateTime.UtcNow.AddDays(-daysActivatedAgo);
            db.ClubMembers.Add(new ClubMember
            {
                ClubId = clubId,
                UserId = userId,
                Role = role,
                MembershipStatus = ClubMembershipStatus.Active,
                RequestedAt = activated.AddDays(-1),
                ActivatedAt = activated,
            });
        }

        // Keep in sync with <see cref="SeedClubMembersAndInvites"/> AddDemoMember calls.
        await TryAddAsync(0, adminId, ClubMemberRole.Admin, 100);
        await TryAddAsync(3, adminId, ClubMemberRole.Member, 40);
        await TryAddAsync(5, adminId, ClubMemberRole.Member, 35);
        await TryAddAsync(2, demoRiderId, ClubMemberRole.Admin, 50);
        await TryAddAsync(4, demoRiderId, ClubMemberRole.Member, 28);
        await TryAddAsync(7, demoRiderId, ClubMemberRole.Member, 22);

        await db.SaveChangesAsync();
    }

    /// <summary>
    /// Inserts demo club chat for each club that has no messages yet and at least two active members.
    /// Idempotent per club. Seeds a multi-day thread with several members so the demo reads like a real chat.
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

        foreach (var club in clubs)
        {
            if (await db.ClubChatMessages.AsNoTracking().AnyAsync(m => m.ClubId == club.Id))
                continue;

            var memberIds = await db.ClubMembers.AsNoTracking()
                .Where(m => m.ClubId == club.Id && m.MembershipStatus == ClubMembershipStatus.Active)
                .OrderBy(m => m.UserId)
                .Select(m => m.UserId)
                .Take(Profile.ClubChatMemberSampleLimit)
                .ToListAsync();

            if (memberIds.Count < 2)
                continue;

            await SeedClubChatConversationAsync(db, club.Id, memberIds, routes, rideGroups, riderUserId, jsonOpts);
        }
    }

    private static string SeedUserDisplayName(ApplicationUser? u) =>
        u == null ? "" : string.Join(" ", new[] { u.FirstName, u.LastName }.Where(x => !string.IsNullOrWhiteSpace(x))).Trim();

    /// <summary>Stable hash so each club gets a different “voice” and scenario (not tied to runtime string hashing).</summary>
    private static int ClubChatMix(int clubId, ReadOnlySpan<char> clubName, int firstMemberId)
    {
        unchecked
        {
            var h = clubId * 7919 + firstMemberId * 65537;
            for (var i = 0; i < clubName.Length; i++)
                h = h * 31 + clubName[i];
            return h;
        }
    }

    /// <summary>
    /// Builds a believable back-and-forth with several authors, staggered timestamps, and a few valid @mentions.
    /// Threads vary by club (scenario + phrase picks) so demos don’t look copy-pasted.
    /// </summary>
    private static async Task SeedClubChatConversationAsync(
        RydoDbContext db,
        int clubId,
        List<int> memberIds,
        List<RouteEntity> routes,
        List<Ride> rideGroups,
        int riderUserId,
        JsonSerializerOptions jsonOpts)
    {
        var clubName = await db.CyclingClubs.AsNoTracking()
            .Where(c => c.Id == clubId)
            .Select(c => c.Name)
            .FirstOrDefaultAsync() ?? "the club";

        var users = await db.Users.AsNoTracking()
            .Where(u => memberIds.Contains(u.Id))
            .ToListAsync();
        var byId = users.ToDictionary(u => u.Id);
        string Dn(int uid) => SeedUserDisplayName(byId.GetValueOrDefault(uid)) is { Length: > 0 } s ? s : $"User {uid}";

        var u0 = memberIds[0];
        var u1 = memberIds[1];
        var u2 = memberIds.Count > 2 ? memberIds[2] : u1;
        var u3 = memberIds.Count > 3 ? memberIds[3] : u0;

        var mix = ClubChatMix(clubId, clubName, u0);
        var scenario = Math.Abs(mix) % Profile.ClubChatScenarioModulo;

        var savedRouteId = await db.SavedRoutes.AsNoTracking()
            .Where(s => s.UserId == u0 || s.UserId == u1)
            .Select(s => s.RouteId)
            .FirstOrDefaultAsync();

        if (savedRouteId == 0)
            savedRouteId = routes[0].Id;

        var routeEntity = routes.FirstOrDefault(r => r.Id == savedRouteId) ?? routes[0];
        savedRouteId = routeEntity.Id;
        var routeTitle = routeEntity.Title.Trim();
        if (routeTitle.Length == 0)
            routeTitle = "this route";

        var nowUtc = DateTime.UtcNow;
        var clubRide = rideGroups
            .Where(r => r.ClubId == clubId && r.Kind == RideKind.Scheduled && r.ScheduledDate >= nowUtc)
            .OrderBy(r => r.ScheduledDate)
            .FirstOrDefault();
        var rideLabel = clubRide != null
            ? $"{clubRide.Name.Trim()} · {clubRide.ScheduledDate.ToUniversalTime():yyyy-MM-dd}"
            : null;

        var dayBack = Profile.ClubChatThreadStartDayBackMin + (Math.Abs(mix >> 3) % Profile.ClubChatThreadStartDayBackExtraMaxExclusive);
        var start = DateTime.UtcNow.AddDays(-dayBack);
        var messages = new List<ClubChatMessage>();
        double t = 0;
        var salt = 0;

        void Add(int authorId, string body, string? mentionsJson)
        {
            if (messages.Count > 0)
            {
                var gap = Profile.ClubChatMessageGapBase + (salt++ * 31 + clubId * 7 + (mix & 0xFF)) % Profile.ClubChatMessageGapSpanMaxExclusive;
                t += gap;
            }

            messages.Add(new ClubChatMessage
            {
                ClubId = clubId,
                AuthorUserId = authorId,
                Body = body,
                MentionsJson = mentionsJson,
                SentAt = start.AddMinutes(t),
            });
        }

        string P(int slot, params string[] options)
        {
            if (options.Length == 0) return "";
            var i = Math.Abs(mix + slot * 9176) % options.Length;
            return options[i];
        }

        switch (scenario)
        {
            case 0:
                Add(u0, P(1, $"Morning {clubName} — anyone thinking Saturday for a longer loop?", $"Hey {clubName} — quick ping: weekend ride still on the radar?", $"Anyone planning something Saturday? I could use a longer morning."), null);
                Add(u1, P(2, "Saturday works. I'm free from 7 onward if we want an early roll-out.", "I can do Saturday. Morning beats afternoon for me.", "Saturday’s good — prefer an early start if we can."), null);
                Add(u2, P(3, "Same here. Forecast keeps changing — worth a backup plan if it's windy.", "Weather widget says sun then rain. I'll trust the sky at dawn.", "I'll watch the wind — if it's nasty I'll bail early."), null);
                Add(u0, P(4, "Let's aim for wheels rolling 7:30 from the usual meet spot. Too keen?", "How about 7:30 meet, same corner as last time?", "Roll at 7:30 unless someone needs 15 more minutes?"), null);
                Add(u1, P(5, "7:30 is fine. I need to be back by 11 — family stuff.", "Works — I’ve got a hard stop at 11.", "7:30 ok. I need to peel off by 11."), null);
                Add(u3, P(6, "I can join for the first hour then peel off toward town.", "First hour only for me — then I split off.", "I'll tag along for the warm-up leg, then head home."), null);
                Add(u0, $"I've got @{routeTitle} saved — {P(7, "nice mix of climb and flat if we want a reference.", "good balance of effort and recovery.", "nothing brutal if we keep it social.")}", JsonSerializer.Serialize(new[] { new { kind = "route", id = savedRouteId } }, jsonOpts));
                Add(u1, P(8, "That profile looks reasonable. Nothing that'll wreck legs for Sunday riders.", "Looks fine — I won’t be destroyed for Sunday.", "Yeah, that won’t cook my legs for the next day."), null);
                Add(u0, $"@{Dn(u1)} if you're on tubeless, bring a plug kit — {P(9, "last time we hit glass on the descent.", "we rolled through junk on that downhill once.", "there was debris last run.")}", JsonSerializer.Serialize(new[] { new { kind = "user", id = u1 } }, jsonOpts));
                Add(u1, P(10, "Already in the saddle bag.", "Packed — spare + lever too.", "Yep, got plugs."), null);
                Add(u3, P(11, "I'm out this weekend — work — but have a great ride and post photos.", "Can’t make it — travel — send pics though.", "Sitting this one out — enjoy!"), null);
                Add(u0, P(12, "Will do — we'll keep the pace social unless everyone's feeling spicy.", "We’ll keep it chill unless the group wants to push.", "Social pace unless the bunch votes otherwise."), null);
                Add(u2, P(13, "Coffee stop after, or straight home? I could use caffeine before noon.", "Cafe afterward or nah?", "Anyone need coffee on the way back?"), null);
                Add(u1, P(14, "Coffee sounds good if we're back by 10:30. Know a place that opens early?", "If we’re back early enough I’m in for espresso.", "Coffee yes if someone knows a spot open early."), null);
                if (clubRide != null && rideLabel != null)
                    Add(u0, P(15, $"Also reminder we've got @{rideLabel} on the calendar — shout if you want in.", $"Calendar has @{rideLabel} — ping me if you’re joining.", $"Don’t forget @{rideLabel} is up — say if you’re in."), JsonSerializer.Serialize(new[] { new { kind = "ride", id = clubRide.Id } }, jsonOpts));
                Add(u2, P(16, "If it's pouring at 6am I'll post here and we can push a day — fair?", "If it’s ugly at dawn I’ll drop a note — reschedule ok?", "Rain check if it’s biblical — I’ll post early."), null);
                Add(u1, P(17, "Sounds fair. I'll watch the thread before I leave the house.", "Yep — I’ll check here before I kit up.", "Fair — I’ll peek at chat before rolling out."), null);
                Add(u0, P(18, "Perfect. See you Saturday unless the sky absolutely falls.", "See you then — unless the weather truly collapses.", "Catch you Saturday if the world doesn’t end."), null);
                Add(u2, $"@{Dn(u0)} thanks for organizing — {P(19, "makes it easy to show up.", "saves us all the chaos.", "appreciate the coordination.")}", JsonSerializer.Serialize(new[] { new { kind = "user", id = u0 } }, jsonOpts));
                Add(u0, P(20, "Any time — that's what the group's for.", "Happy to — that’s the point of the club.", "Of course — glad it helps."), null);
                break;

            case 1:
                Add(u1, $"Anyone fancy a lazy Sunday roll — {P(30, "late start", "10-ish", "brunch-adjacent timing")}?", null);
                Add(u0, P(31, "Sunday works. I’m useless before 9 though.", "Sunday yes — don’t make me meet at dawn.", "I’m in — prefer not freezing in the dark."), null);
                Add(u2, P(32, "Social pace? My legs are toast from midweek intervals.", "Keep it conversational — legs are tired.", "Easy spins only — I overdid it Tuesday."), null);
                Add(u1, $"@{routeTitle} is a mellow loop if we want a reference.", JsonSerializer.Serialize(new[] { new { kind = "route", id = savedRouteId } }, jsonOpts));
                Add(u0, P(33, "That works — mostly flat with one cheeky ramp.", "Yeah — chill profile. One little climb.", "Fine by me — nothing scary."), null);
                Add(u3, P(34, "I’ll swing by for the first half then duck out.", "I can join for a bit then bail.", "Short stint for me — family lunch."), null);
                Add(u2, P(35, "Brunch after if anyone’s hungry? There’s that place near the river.", "Food after? I’m always hungry.", "Post-ride pancakes — who’s weak?"), null);
                Add(u0, P(36, "I’m in for food if we’re back by 12:30.", "Brunch yes if timing works.", "Pancakes sound dangerous — count me in."), null);
                if (clubRide != null && rideLabel != null)
                    Add(u1, $"Side note — @{rideLabel} is still on the calendar too.", JsonSerializer.Serialize(new[] { new { kind = "ride", id = clubRide.Id } }, jsonOpts));
                Add(u2, $"@{Dn(u0)} can you bring a pump? Mine hisses.", JsonSerializer.Serialize(new[] { new { kind = "user", id = u0 } }, jsonOpts));
                Add(u0, P(37, "Yeah — floor pump in the car.", "Will bring — floor pump.", "Got you — I’ll toss it in."), null);
                Add(u1, P(38, "You’re a hero.", "Legend.", "Thanks — owe you a coffee."), null);
                Add(u2, P(39, "If it rains I’m sleeping in. No guilt.", "Rain = cancel and sleep.", "Wet Sunday = couch."), null);
                Add(u0, P(40, "Same. I’ll post if it looks grim.", "I’ll drop a note if it’s awful out.", "I’ll ping the thread if it’s trash weather."), null);
                Add(u1, P(41, "Deal. See you Sunday if the sun cooperates.", "Sunday it is — weather permitting.", "Sunday crew — fingers crossed."), null);
                break;

            case 2:
                Add(u0, P(50, "Thursday evening — quick loop before dark. Who’s in?", "Anyone for a weeknight spin Thursday?", "Thinking a short Thursday after work — join?"), null);
                Add(u1, P(51, "I can do 18:00 meet if we’re efficient.", "18:00 works — need to be home for dinner.", "Thursday ok — tight on time."), null);
                Add(u2, P(52, "Lights charged. Days are short.", "Got blinkers — sunset sneaks up.", "Running front+rear — it’s dim out there."), null);
                Add(u0, $"Route idea: @{routeTitle} — trimmed to ~35km.", JsonSerializer.Serialize(new[] { new { kind = "route", id = savedRouteId } }, jsonOpts));
                Add(u3, P(53, "35 is perfect — I’m not chasing PRs on a weeknight.", "35 sounds humane.", "Short and sweet — good."), null);
                Add(u1, P(54, "Meet at the usual or the north lot?", "Same meet spot as last week?", "North lot or classic corner?"), null);
                Add(u0, P(55, "Usual is fine — fewer cars.", "Classic corner — easier to find.", "Let’s do the usual — predictable."), null);
                Add(u2, P(56, "If I’m late, roll — don’t wait forever.", "Don’t wait if I’m stuck at work — go.", "Start without me if I’m 5 late — I’ll chase."), null);
                Add(u1, P(57, "Fair — we regroup at the bridge.", "Regroup bridge — same as always.", "Bridge regroup — works."), null);
                if (clubRide != null && rideLabel != null)
                    Add(u0, $"Also @{rideLabel} is coming up — different vibe but FYI.", JsonSerializer.Serialize(new[] { new { kind = "ride", id = clubRide.Id } }, jsonOpts));
                Add(u2, P(58, "Tubeless check before we descend — last week someone burped.", "Quick tire check before the downhill?", "Someone burped a tire last time — quick glance before the drop?"), null);
                Add(u0, $"@{Dn(u1)} you good leading the descent?", JsonSerializer.Serialize(new[] { new { kind = "user", id = u1 } }, jsonOpts));
                Add(u1, P(59, "Yep — I’ll sweep if needed.", "I can lead — happy to sweep too.", "Sure — I’ll take point."), null);
                Add(u2, P(60, "Rain cancels for me — fair?", "If it pours I’m out — ok?", "Wet roads = skip for me."), null);
                Add(u0, P(61, "Totally — life’s too short for sketchy corners.", "Agreed — no heroics in the wet.", "Same — safety first."), null);
                break;

            default:
                Add(u2, P(70, "Gravel-curious this weekend — anyone game if trails aren’t soup?", "Mixed surface Saturday? If it’s not a swamp.", "Thinking dirt-ish — who’s brave?"), null);
                Add(u0, P(71, "If it’s dry-ish I’m in. Mud and I aren’t friends.", "Dry gravel yes — peanut butter mud no.", "Depends on tack — I hate cleaning the bike."), null);
                Add(u1, P(72, "I’ll bring the wider rubber just in case.", "I'll run 38s — better safe.", "Throwing on bigger tires — peace of mind."), null);
                Add(u0, $"@{routeTitle} has a dirt segment — not insane.", JsonSerializer.Serialize(new[] { new { kind = "route", id = savedRouteId } }, jsonOpts));
                Add(u3, P(73, "I’m road-only this week — ankle tweak.", "Sitting out — ankle.", "Can’t — minor injury — next time."), null);
                Add(u2, P(74, "Heal up — we’ll save the dust for you.", "Rest — we’ll send pics.", "Get well — gravel waits."), null);
                Add(u1, P(75, "Pack layers — temp swings out there.", "Layers — it’s cold at 8, oven by 11.", "Wind jacket in the pocket — trust me."), null);
                Add(u0, $"@{Dn(u2)} you bringing snacks or should I?", JsonSerializer.Serialize(new[] { new { kind = "user", id = u2 } }, jsonOpts));
                Add(u2, P(76, "I’ve got bars — someone grab water?", "Bars in my pack — who has bottles?", "I’ll bring gels — grab water?"), null);
                Add(u0, P(77, "I’ll carry extra bottle — no worries.", "I’ll bring water — sorted.", "Water on me."), null);
                if (clubRide != null && rideLabel != null)
                    Add(u1, $"Club ride @{rideLabel} is still on the radar too — different beast.", JsonSerializer.Serialize(new[] { new { kind = "ride", id = clubRide.Id } }, jsonOpts));
                Add(u2, P(78, "If the forecast flips I’ll scream in this thread.", "Weather drama = I’ll post here first.", "I’ll update if it tanks."), null);
                Add(u0, P(79, "Sounds good — see you if the trails behave.", "Catch you if the earth cooperates.", "On if it’s not a bog."), null);
                break;
        }

        // user@rydo.test often maps to the lowest member id (u0) and many scenarios end on u0 — that makes him the last
        // speaker in every demo club. Append a short line from someone else when the tail author is the demo rider.
        if (messages.Count > 0 && messages[^1].AuthorUserId == riderUserId)
        {
            var other = memberIds.FirstOrDefault(uid => uid != riderUserId);
            if (other != 0)
                Add(other, P(900, "Sounds good — see you then.", "See you out there.", "Catch you on the road."), null);
        }

        db.ClubChatMessages.AddRange(messages);
        await db.SaveChangesAsync();

        var ordered = messages.OrderBy(m => m.Id).ToList();
        if (ordered.Count > 0)
        {
            // Each member's read cursor is their last own message — they haven't "opened" anything after that send.
            foreach (var uid in memberIds)
            {
                var lastOwn = ordered.Where(m => m.AuthorUserId == uid).LastOrDefault();
                if (lastOwn == null)
                    continue;
                db.ClubChatReadStates.Add(new ClubChatReadState
                {
                    ClubId = clubId,
                    UserId = uid,
                    LastReadMessageId = lastOwn.Id,
                });
            }
        }

        await db.SaveChangesAsync();
    }

    private static async Task SeedActivityHistoryAndMetadataAsync(
        RydoDbContext db,
        IReadOnlyList<RouteEntity> routes,
        List<Ride> rideGroups,
        List<Ride> personalRideGroups,
        IReadOnlyList<int> userIds,
        DeterministicSeed det)
    {
        var (membersByClub, clubsByUser) = await LoadActiveMembershipMapsAsync(db);
        var fallbackClubId = await db.CyclingClubs.OrderBy(c => c.Id).Select(c => c.Id).FirstAsync();
        EnsureEveryUserHasActiveClubMembership(db, userIds, fallbackClubId, membersByClub, clubsByUser);
        await db.SaveChangesAsync();

        var rideIds = rideGroups.Select(r => r.Id).Distinct().ToArray();
        var partIndex = await ParticipantIndex.LoadExistingAsync(db, rideIds);

        SeedRideParticipants(db, rideGroups.Where(r => r.ClubId.HasValue).ToList(), membersByClub, partIndex, det);
        // Flush so LINQ against RideParticipants sees these rows (avoids duplicate composite keys in the change tracker).
        await db.SaveChangesAsync();

        EnsureAllUsersParticipantInSomeClubRide(db, rideGroups, userIds, clubsByUser, partIndex);
        SeedPersonalRideParticipants(db, personalRideGroups, userIds, partIndex, det);
        await db.SaveChangesAsync();

        EnsureAllUsersHaveFutureClubRideParticipation(db, rideGroups, userIds, clubsByUser, partIndex);
        EnsureVariedClubRideParticipations(db, rideGroups, userIds, clubsByUser, partIndex, det);

        if (!await db.Challenges.AnyAsync())
            db.Challenges.AddRange(SeedChallenges(det));

        if (!await db.UserPreferences.AnyAsync())
            SeedUserPreferences(db, userIds);

        // Participant seeding must not increase the number of future-dated rides; enforce cap last.
        ApplyRideScheduleCaps(
            rideGroups,
            maxUpcomingTotal: Profile.Time.MaxUpcomingTotal,
            maxUpcomingPerClub: Profile.Time.MaxUpcomingPerClub);

        await db.SaveChangesAsync();

        EnsureAllUsersHaveFutureClubRideParticipation(db, rideGroups, userIds, clubsByUser, partIndex);
        await db.SaveChangesAsync();

        await SeedHistoryAsync(db, routes.ToList(), userIds, personalRideGroups, rideGroups, partIndex, det);
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

        for (var i = 0; i < Profile.CommunityRiderCount; i++)
        {
            var riderNo = Profile.CommunityRiderEmailStartNumber + i;
            var email = Profile.CommunityRiderEmail(riderNo);
            var existing = await userManager.FindByEmailAsync(email);
            if (existing != null)
            {
                list.Add(existing);
                continue;
            }

            var u = new ApplicationUser
            {
                UserName = email,
                Email = email,
                EmailConfirmed = true,
                FirstName = first[i % first.Length],
                LastName = last[i % last.Length],
                CreatedAt = DateTime.UtcNow.AddDays(-(Profile.CommunityAccountAgeDaysBase + i * Profile.CommunityAccountAgeDaysStep)),
                Bio = $"Community rider — usually out on {(i % 2 == 0 ? "gravel" : "road")} at the weekend.",
                Location = i % 4 == 0 ? "Jerusalem" : i % 4 == 1 ? "Beer Sheva" : i % 4 == 2 ? "Netanya" : "Herzliya",
                AvatarUrl = $"https://api.dicebear.com/7.x/avataaars/svg?seed=rider{riderNo}",
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

    /// <summary>
    /// Per-user sampling weights for who “published” seeded routes: Zipf by rank, with rank order shuffled
    /// deterministically by user id so top publishers are not always the first rows in <paramref name="users"/>.
    /// </summary>
    private static int[] BuildRoutePublisherWeights(IReadOnlyList<ApplicationUser> users, DeterministicSeed det)
    {
        var n = users.Count;
        if (n == 0)
            return [];

        var order = new int[n];
        for (var i = 0; i < n; i++)
            order[i] = i;

        Array.Sort(order, (a, b) =>
        {
            var ha = SeedDeterminism.Mix(det.Root, SeedGraph.Salt.GroopyRoutePublisherOrder, users[a].Id);
            var hb = SeedDeterminism.Mix(det.Root, SeedGraph.Salt.GroopyRoutePublisherOrder, users[b].Id);
            return hb.CompareTo(ha);
        });

        var weights = new int[n];
        var scale = Profile.RoutePublisherZipfScale;
        var exp = Profile.RoutePublisherZipfExponent;
        for (var rank = 0; rank < n; rank++)
        {
            var userIdx = order[rank];
            var zipf = (int)(scale / Math.Pow(rank + 1, exp));
            weights[userIdx] = Math.Max(SeedBehaviorWeights.MinUserWeight, zipf);
        }

        return weights;
    }

    private static List<RouteEntity> LoadGroopyRoutesFromSeed(string contentRoot, IReadOnlyList<ApplicationUser> users, DeterministicSeed det)
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

        var publisherWeights = BuildRoutePublisherWeights(users, det);
        var list = new List<RouteEntity>();
        var acceptedRowOrdinal = 0;
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

            var dist = pathKm > 0 ? pathKm : (row.LengthKm ?? Profile.RouteFallbackDistanceKm);
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

            var creatorIdx = SeedBehaviorWeights.PickWeightedIndex(
                publisherWeights,
                det,
                SeedGraph.Salt.GroopyRouteCreator,
                row.Pid,
                acceptedRowOrdinal);
            var creator = users[creatorIdx];
            var daysAgo = det.Int(Profile.RouteCreatedDaysAgoMin, Profile.RouteCreatedDaysAgoMaxExclusive, SeedGraph.Salt.GroopyRouteCreatedDays, row.Pid, acceptedRowOrdinal);

            double? physicsScore = null;
            if (RoutePhysicsDifficulty.TryComputeIntensityDensityJPerKm(bytes, out var densityJPerKm))
            {
                var s = RoutePhysicsDifficulty.DensityToNotebookScaledScore(densityJPerKm);
                if (double.IsFinite(s))
                    physicsScore = s;
            }

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
                PhysicsDifficultyScore = physicsScore,
                CreatedByUserId = creator.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-daysAgo),
                Status = "published",
                GpxReference = $"routes/{row.GpxFileName}",
                GpxBlob = bytes,
            });
            acceptedRowOrdinal++;
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

    private static void SeedSavedRoutes(RydoDbContext db, List<RouteEntity> routes, IReadOnlyList<int> userIds, DeterministicSeed det)
    {
        var minSavedPerUser = Profile.MinSavedRoutesPerUser;
        var pairs = new HashSet<(int UserId, int RouteId)>();
        var perUser = userIds.ToDictionary(id => id, _ => 0);

        var ids = userIds.ToList();
        var savedWeights = ids.Select(id => SeedBehaviorWeights.SavedRouteWeight(SeedUserTraits.For(id, det.Root))).ToList();

        var target = Math.Min(Profile.MaxSavedRoutePairingsTotal, Math.Max(routes.Count * userIds.Count / 2, userIds.Count * minSavedPerUser));
        for (var n = 0; n < target; n++)
        {
            var wi = SeedBehaviorWeights.PickWeightedIndex(savedWeights, det, SeedGraph.Salt.SavedRoutePair, n, 0);
            var u = ids[wi];
            var r = routes[det.PickIndex(routes.Count, SeedGraph.Salt.SavedRoutePair, n, 1)];
            if (!pairs.Add((u, r.Id)))
                continue;
            db.SavedRoutes.Add(new SavedRoute { UserId = u, RouteId = r.Id });
            perUser[u]++;
        }

        foreach (var uid in userIds)
        {
            var attempts = 0;
            while (perUser[uid] < minSavedPerUser && attempts < routes.Count * Profile.SavedRoutesTopUpMaxAttemptsPerUserRoutes)
            {
                attempts++;
                var r = routes[det.PickIndex(routes.Count, SeedGraph.Salt.SavedRouteTopUp, uid, attempts)];
                if (!pairs.Add((uid, r.Id)))
                    continue;
                db.SavedRoutes.Add(new SavedRoute { UserId = uid, RouteId = r.Id });
                perUser[uid]++;
            }
        }
    }

    private static List<HazardEntity> SeedHazards(IReadOnlyList<ApplicationUser> users, DeterministicSeed det)
    {
        var types = new[] { "pothole", "construction", "debris", "flooding", "poor_lighting", "road_damage", "glass", "animals" };
        var severities = new[] { "low", "medium", "high" };
        var regions = new[] { "Tel Aviv–Jaffa", "Haifa", "Jerusalem", "Beer Sheva", "Netanya", "Ashdod", "Rishon", "Petah Tikva" };
        var statuses = new[] { "active", "active", "active", "active", "active", "resolved", "acknowledged" };

        var list = new List<HazardEntity>();
        var baseLat = Profile.HazardBaseLatitude;
        var baseLng = Profile.HazardBaseLongitude;

        var hazardUsers = users.OrderBy(u => u.Id).ToList();
        var hazardWeights = hazardUsers
            .Select(u => SeedBehaviorWeights.HazardReporterWeight(SeedUserTraits.For(u.Id, det.Root)))
            .ToList();

        for (var i = 0; i < Profile.HazardCount; i++)
        {
            var wi = SeedBehaviorWeights.PickWeightedIndex(hazardWeights, det, SeedGraph.Salt.Hazard, i, 6);
            var reporter = hazardUsers[wi];
            var status = statuses[det.PickIndex(statuses.Length, SeedGraph.Salt.Hazard, 1, i)];
            list.Add(new HazardEntity
            {
                Type = types[i % types.Length],
                Severity = severities[det.PickIndex(severities.Length, SeedGraph.Salt.Hazard, 2, i)],
                Description = DescribeHazard(types[i % types.Length], regions[i % regions.Length]),
                Latitude = baseLat + (det.Double01(SeedGraph.Salt.Hazard, i, 3) - 0.5) * 0.5,
                Longitude = baseLng + (det.Double01(SeedGraph.Salt.Hazard, i, 4) - 0.5) * 0.55,
                Region = regions[i % regions.Length],
                Status = status,
                ReportedByUserId = reporter.Id,
                ReportedAt = DateTime.UtcNow.AddDays(-det.Int(0, Profile.HazardReportedDaysMaxExclusive, SeedGraph.Salt.Hazard, 5, i)),
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
        DeterministicSeed det)
    {
        var a = admin.Id;
        var r = rider.Id;
        var others = allUsers.Where(u => u.Id != a && u.Id != r).OrderBy(u => u.Id).ToList();
        var clubCount = clubs.Count;
        var adminSlots = clubCount * Profile.AdminsPerClub;
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

            // Additional active members per club from the non-admin pool (see profile for count range).
            var seenInClub = new HashSet<int> { lead.Id, co.Id };
            var extra = Math.Min(memberPool.Count, Profile.ExtraClubMembersBase + det.Int(0, Profile.ExtraClubMembersExtraRandMaxExclusive, SeedGraph.Salt.ClubExtraMember, i, 0));
            for (var j = 0; j < extra; j++)
            {
                var u = memberPool[(i * 5 + j) % memberPool.Count];
                if (!seenInClub.Add(u.Id)) continue;
                AddMember(u.Id, ClubMemberRole.Member, ClubMembershipStatus.Active, det.Int(Profile.ClubMemberActivatedDaysMin, Profile.ClubMemberActivatedDaysMaxExclusive, SeedGraph.Salt.ClubExtraMember, i, j + 1));
            }
        }

        // Demo logins: exactly three active clubs each — separate chat threads + unread badges (see EnsureClubChatSeedAsync).
        // admin@rydo.test: indices 0 (admin), 3, 5 (member). user@rydo.test: 2 (admin), 4, 7 (member). Disjoint sets.
        void AddDemoMember(int clubIndex, int userId, ClubMemberRole role, int daysActivatedAgo)
        {
            if (clubIndex < 0 || clubIndex >= clubCount) return;
            var cid = clubs[clubIndex].Id;
            if (db.ClubMembers.Any(m => m.ClubId == cid && m.UserId == userId)) return;
            var activated = DateTime.UtcNow.AddDays(-daysActivatedAgo);
            db.ClubMembers.Add(new ClubMember
            {
                ClubId = cid,
                UserId = userId,
                Role = role,
                MembershipStatus = ClubMembershipStatus.Active,
                RequestedAt = activated.AddDays(-1),
                ActivatedAt = activated,
            });
        }

        AddDemoMember(0, a, ClubMemberRole.Admin, 100);
        AddDemoMember(3, a, ClubMemberRole.Member, 40);
        AddDemoMember(5, a, ClubMemberRole.Member, 35);
        AddDemoMember(2, r, ClubMemberRole.Admin, 50);
        AddDemoMember(4, r, ClubMemberRole.Member, 28);
        AddDemoMember(7, r, ClubMemberRole.Member, 22);

        var jerusalemId = clubs[1].Id;
        var jerusalemLead = others[2];
        db.ClubInvites.Add(new ClubInvite
        {
            ClubId = jerusalemId,
            Token = "seed-invite-jerusalem-hills-demo",
            CreatedByUserId = jerusalemLead.Id,
            CreatedAt = DateTime.UtcNow.AddDays(-5),
            MaxUses = Profile.JerusalemInviteMaxUses,
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
            g.ScheduledDate = now.AddDays(-Profile.CapMoveToPastDaysBase - (i - maxUpcoming)).Date.AddHours(10 + (i % Profile.CapPastHourSpread));
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
                g.ScheduledDate = now.AddDays(-Profile.CapPerClubMoveToPastDaysBase - (i - maxPerClub)).Date.AddHours(10 + (i % Profile.CapPastHourSpread));
            }
        }
    }

    private static List<Ride> SeedRideGroups(
        RydoDbContext db,
        List<RouteEntity> routes,
        DeterministicSeed det,
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
            "Dawn Patrol Express", "Saturday Social Roll", "TT Practice Squad", "Scenic Route Sundays",
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
        var upcomingClub = Profile.UpcomingClubRideCount;
        var pastCount = names.Length - upcomingClub;

        var list = new List<Ride>();
        for (var i = 0; i < names.Length; i++)
        {
            var route = routes[det.PickIndex(routes.Count, SeedGraph.Salt.ClubRideSchedule, i, 0)];
            DateTime scheduled;
            if (i < pastCount)
            {
                var daysAgo = i % 3 switch
                {
                    0 => det.Int(Profile.Time.ClubPastRecentDays.Min, Profile.Time.ClubPastRecentDays.Max, SeedGraph.Salt.ClubRideSchedule, i, 1),
                    1 => det.Int(Profile.Time.ClubPastMidDays.Min, Profile.Time.ClubPastMidDays.Max, SeedGraph.Salt.ClubRideSchedule, i, 2),
                    _ => det.Int(Profile.Time.ClubPastOlderDays.Min, Profile.Time.ClubPastOlderDays.Max, SeedGraph.Salt.ClubRideSchedule, i, 3),
                };
                scheduled = now.AddDays(-daysAgo).Date.AddHours(
                    det.Int(Profile.Time.ClubUpcomingHourMin, Profile.Time.ClubUpcomingHourMaxExclusive, SeedGraph.Salt.ClubRideSchedule, i, 4));
            }
            else
            {
                var u = i - pastCount;
                scheduled = now
                    .AddDays(Profile.Time.ClubUpcomingStartDays + u * Profile.Time.ClubUpcomingCadenceDays)
                    .Date
                    .AddHours(det.Int(Profile.Time.ClubUpcomingHourMin, Profile.Time.ClubUpcomingHourMaxExclusive, SeedGraph.Salt.ClubRideSchedule, i, 5));
            }

            var clubId = clubs[i % clubs.Count].Id;
            var rg = new Ride
            {
                Kind = RideKind.Scheduled,
                Name = names[i],
                Description = $"Open group ride — {route.Region ?? "mixed terrain"}. Respect traffic rules.",
                ScheduledDate = scheduled,
                RouteId = route.Id,
                MaxParticipants = Profile.ClubRideMaxParticipantsMin + det.Int(0, Profile.ClubRideMaxParticipantsSpan, SeedGraph.Salt.ClubRideParticipantsCap, i, 0),
                CreatedByUserId = CreatorForClub(clubId),
            };
            rg.ClubId = clubId;
            list.Add(rg);
        }

        return list;
    }

    private static List<Ride> SeedPersonalRideGroups(List<RouteEntity> routes, DeterministicSeed det, IReadOnlyList<ApplicationUser> users)
    {
        var now = DateTime.UtcNow;
        var pick = (int slot) => routes[det.PickIndex(routes.Count, SeedGraph.Salt.PersonalRide, 0, slot)];
        int Org(int slot) => users[det.PickIndex(users.Count, SeedGraph.Salt.PersonalRide, 1, slot)].Id;
        // Few personal scheduled rides so seeded data skews club-heavy (club list size trades off vs this list).
        return new List<Ride>
        {
            new()
            {
                Kind = RideKind.Scheduled,
                Name = "Solo sunrise spin",
                Description = "Personal ride — no club.",
                ScheduledDate = now.AddDays(-Profile.Time.PersonalPastDays).Date.AddHours(Profile.PersonalPastRideHour),
                RouteId = pick(0).Id,
                MaxParticipants = Profile.PersonalRideMaxParticipants,
                ClubId = null,
                CreatedByUserId = Org(0),
            },
            new()
            {
                Kind = RideKind.Scheduled,
                Name = "Lunch loop — personal",
                Description = "Quick midday miles — route TBD.",
                ScheduledDate = now.AddDays(Profile.Time.PersonalFutureDays).Date.AddHours(Profile.PersonalFutureRideHour),
                RouteId = null,
                MaxParticipants = Profile.PersonalRideMaxParticipants,
                ClubId = null,
                CreatedByUserId = Org(1),
            },
        };
    }

    /// <summary>
    /// Adds a small participant set per personal ride (2–4 when enough users exist) so club rides carry most
    /// participation variance. Always includes <see cref="Ride.CreatedByUserId"/> when that user is seeded.
    /// </summary>
    private static void SeedPersonalRideParticipants(
        RydoDbContext db,
        List<Ride> personalGroups,
        IReadOnlyList<int> userIds,
        ParticipantIndex partIndex,
        DeterministicSeed det)
    {
        var ordered = userIds.OrderBy(id => id).ToList();
        if (ordered.Count == 0)
            return;

        var idSet = ordered.ToHashSet();

        foreach (var g in personalGroups.OrderBy(g => g.Id))
        {
            var maxSmall = Math.Min(Profile.PersonalRideParticipantsMax, ordered.Count);
            var minSmall = Math.Min(Profile.PersonalRideParticipantsMin, ordered.Count);
            var target = minSmall > maxSmall ? minSmall : det.Int(minSmall, maxSmall + 1, SeedGraph.Salt.PersonalRideParticipants, g.Id, 0);

            var chosen = new HashSet<int>();
            if (idSet.Contains(g.CreatedByUserId))
                chosen.Add(g.CreatedByUserId);
            else
                chosen.Add(ordered[det.PickIndex(ordered.Count, SeedGraph.Salt.PersonalRideParticipants, g.Id, 1)]);

            var pool = ordered.Where(u => !chosen.Contains(u)).ToList();
            var step = 0;
            while (chosen.Count < target && pool.Count > 0)
            {
                var idx = det.PickIndex(pool.Count, SeedGraph.Salt.PersonalRideParticipants, g.Id, step++);
                chosen.Add(pool[idx]);
                pool.RemoveAt(idx);
            }

            foreach (var uid in chosen.OrderBy(u => u))
            {
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
            anyClub.ScheduledDate = now.AddDays(Profile.EnsureFutureRideWhenEmptyListDays).Date.AddHours(Profile.EnsureFutureRideHour);
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
            promote.ScheduledDate = now.AddDays(Profile.EnsureFutureRidePromoteDays).Date.AddHours(Profile.EnsureFutureRideHour);
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
                any.ScheduledDate = now.AddDays(Profile.EnsureFutureRideLastResortDays).Date.AddHours(Profile.EnsureFutureRideHour);
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
    /// Adds many <see cref="RideParticipant"/> rows on scheduled club rides only, with per-user targets and
    /// shuffled ride order so totals spread naturally (better leaderboards than a fixed minimum for everyone).
    /// </summary>
    private static void EnsureVariedClubRideParticipations(
        RydoDbContext db,
        List<Ride> allRides,
        IReadOnlyList<int> userIds,
        IReadOnlyDictionary<int, List<int>> clubsByUser,
        ParticipantIndex partIndex,
        DeterministicSeed det)
    {
        static int CountClubScheduledParticipations(ParticipantIndex idx, int userId, List<Ride> rides)
        {
            var n = 0;
            foreach (var ride in rides)
            {
                if (ride.ClubId is null || ride.Kind != RideKind.Scheduled)
                    continue;
                if (idx.Has(ride.Id, userId))
                    n++;
            }

            return n;
        }

        var usersShuffled = userIds.ToList();
        det.Shuffle(usersShuffled, SeedGraph.Salt.VariedParticipation, 0, 0);

        foreach (var uid in usersShuffled)
        {
            if (!clubsByUser.TryGetValue(uid, out var myClubs) || myClubs.Count == 0)
                continue;

            var traits = SeedUserTraits.For(uid, det.Root);
            // Wider spread + mild boost for multi-club members (demo riders) so club overlap isn't a flat histogram.
            var target = det.Int(Profile.VariedParticipationTargetMin, Profile.VariedParticipationTargetMaxExclusive, SeedGraph.Salt.VariedParticipation, uid, 0)
                + myClubs.Count * det.Int(0, Profile.VariedParticipationClubBoostMaxExclusive, SeedGraph.Salt.VariedParticipation, uid, 1)
                + (uid % Profile.VariedParticipationUidModulo)
                + SeedBehaviorWeights.ParticipationTargetDelta(traits, Profile.UserBehaviorParticipationTraitStrength);
            target = Math.Min(target, Profile.VariedParticipationAbsoluteCap);

            var need = target - CountClubScheduledParticipations(partIndex, uid, allRides);
            if (need <= 0)
                continue;

            var eligible = allRides
                .Where(r => r.ClubId.HasValue
                    && r.Kind == RideKind.Scheduled
                    && UserMayJoinClubRide(r, uid, clubsByUser))
                .ToList();
            det.Shuffle(eligible, SeedGraph.Salt.VariedParticipation, uid, 0);

            foreach (var ride in eligible)
            {
                if (need <= 0)
                    break;
                if (partIndex.Has(ride.Id, uid))
                    continue;
                var cnt = partIndex.CountForRide(ride.Id);
                if (cnt >= ride.MaxParticipants)
                    continue;
                partIndex.Add(db, ride.Id, uid);
                need--;
            }

            var pass = 1;
            while (need > 0)
            {
                var progressed = false;
                det.Shuffle(eligible, SeedGraph.Salt.VariedParticipation, uid, pass++);
                foreach (var ride in eligible)
                {
                    if (need <= 0)
                        break;
                    if (!UserMayJoinClubRide(ride, uid, clubsByUser))
                        continue;
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
        ParticipantIndex partIndex,
        DeterministicSeed det)
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

            var k = Math.Min(members.Count, det.Int(Profile.InitialClubRideParticipantsMin, Profile.InitialClubRideParticipantsMaxExclusive, SeedGraph.Salt.RideParticipantPick, ride.Id, idxInClub)
                + (Math.Abs(ride.Id * 17 + idxInClub * 3) % Profile.InitialClubRideParticipantSpreadModulo));
            var start = (ride.Id * 7919 + det.PickIndex(members.Count, SeedGraph.Salt.RideParticipantPick, ride.Id, idxInClub + 1000)) % members.Count;
            for (var t = 0; t < k; t++)
            {
                var uid = members[(start + t) % members.Count];
                if (!partIndex.Has(ride.Id, uid))
                    partIndex.Add(db, ride.Id, uid);
            }
        }
    }

    private static List<ChallengeEntity> SeedChallenges(DeterministicSeed det)
    {
        var now = DateTime.UtcNow;
        return new List<ChallengeEntity>
        {
            new()
            {
                Title = "Spring Vertical Challenge",
                Description = "Accumulate 5,000 m elevation before summer.",
                TargetValue = 5000,
                CurrentValue = 3200 + det.Int(0, Profile.ChallengeElevationProgressBonusMax, SeedGraph.Salt.ChallengeProgress, 0, 0),
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
                CurrentValue = 210 + det.Int(0, Profile.ChallengeDistanceProgressBonusMax, SeedGraph.Salt.ChallengeProgress, 1, 0),
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
        IReadOnlyList<Ride> allRideGroups,
        ParticipantIndex partIndex,
        DeterministicSeed det)
    {
        if (routes.Count == 0 || userIds.Count == 0)
            return;

        var soloRides = new List<Ride>();
        var soloMeta = new List<(RouteEntity Route, int UserId, DateTime CompletedAt, bool Sparse, int Dur)>();
        var seq = 0;
        foreach (var userId in userIds.OrderBy(u => u))
        {
            var traits = SeedUserTraits.For(userId, det.Root);
            var rawSolo = det.Int(Profile.SoloRidesPerUserMin, Profile.SoloRidesPerUserMaxExclusive, SeedGraph.Salt.SoloHistory, userId, 0);
            var soloCount = SeedBehaviorWeights.SkewExclusiveRange(
                Profile.SoloRidesPerUserMin,
                Profile.SoloRidesPerUserMaxExclusive,
                rawSolo,
                traits.ActivityMillis,
                Profile.UserBehaviorSoloSkewStrength);
            for (var k = 0; k < soloCount; k++, seq++)
            {
                var route = routes[(userId * 131 + seq * 17) % routes.Count];
                int daysAgo;
                if (k < Profile.Time.GuaranteedWeeklyStreakWeeks)
                {
                    // Guarantee one ride in each of the latest N weeks to produce realistic weekly streaks.
                    var jitter = k == 0
                        ? det.Int(Profile.Time.SoloHistoryCurrentWeekDays.Min, Profile.Time.SoloHistoryCurrentWeekDays.Max + 1, SeedGraph.Salt.SoloHistory, userId, k, seq)
                        : det.Int(0, Profile.SoloWeeklyStreakExtraJitterMaxExclusive, SeedGraph.Salt.SoloHistory, userId, k, seq);
                    daysAgo = k * 7 + jitter;
                }
                else
                {
                    daysAgo = k switch
                    {
                        0 => det.Int(Profile.Time.SoloHistoryRecentDays.Min, Profile.Time.SoloHistoryRecentDays.Max + 1, SeedGraph.Salt.SoloHistory, userId, k, seq),
                        1 => det.Int(Profile.Time.SoloHistoryMidDays.Min, Profile.Time.SoloHistoryMidDays.Max + 1, SeedGraph.Salt.SoloHistory, userId, k, seq),
                        _ => det.Int(Profile.Time.SoloHistoryOlderDays.Min, Profile.Time.SoloHistoryOlderDays.Max + 1, SeedGraph.Salt.SoloHistory, userId, k, seq),
                    };
                }
                var completedAt = DateTime.UtcNow.AddDays(-daysAgo);
                var sparseMod = SeedBehaviorWeights.SoloSparseModulo(Profile.SoloSparseEveryN, traits);
                var sparse = seq % sparseMod == 0;
                var durJitter = seq % Profile.SoloDurationJitterModulo - Profile.SoloDurationJitterCenter;
                var dur = Math.Max(Profile.SoloMinDurationMinutes, route.EstimatedDurationMinutes + durJitter);
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
                var dur = Math.Max(Profile.SoloMinDurationMinutes, route.EstimatedDurationMinutes + pi % Profile.HistoryDurationJitterModulo - Profile.HistoryDurationJitterCenter);
                var distFactor = 0.94 + pi % Profile.HistoryDistanceFactorModulo * 0.01;
                var elevFactor = 0.92 + pi % Profile.HistoryElevationFactorModulo * 0.01;
                db.HistoryEntries.Add(new HistoryEntry
                {
                    UserId = uid,
                    RouteId = route.Id,
                    RouteTitle = route.Title,
                    CompletedAt = g.ScheduledDate.AddHours(Profile.HistoryStartHourOffset) + TimeSpan.FromMinutes(pi * Profile.HistoryParticipantMinuteStep),
                    DurationMinutes = dur,
                    DistanceKm = Math.Round(route.DistanceKm * distFactor, 1),
                    ElevationGainM = Math.Round(route.ElevationGainM * elevFactor, 1),
                    RideId = g.Id,
                });
            }
        }

        // Past club rides: same stats semantics as personal group rides (one history row per participant).
        foreach (var g in allRideGroups
                     .Where(x => x.ClubId != null
                         && x.Kind != RideKind.SoloLog
                         && x.ScheduledDate < now
                         && x.RouteId.HasValue)
                     .OrderBy(x => x.Id))
        {
            var route = routes.First(r => r.Id == g.RouteId!.Value);
            var participantIds = partIndex.GetUserIdsOnRideOrdered(g.Id);

            for (var pi = 0; pi < participantIds.Count; pi++)
            {
                var uid = participantIds[pi];
                var dur = Math.Max(Profile.SoloMinDurationMinutes, route.EstimatedDurationMinutes + pi % Profile.HistoryDurationJitterModulo - Profile.HistoryDurationJitterCenter);
                var distFactor = 0.94 + pi % Profile.HistoryDistanceFactorModulo * 0.01;
                var elevFactor = 0.92 + pi % Profile.HistoryElevationFactorModulo * 0.01;
                db.HistoryEntries.Add(new HistoryEntry
                {
                    UserId = uid,
                    RouteId = route.Id,
                    RouteTitle = route.Title,
                    CompletedAt = g.ScheduledDate.AddHours(Profile.HistoryStartHourOffset) + TimeSpan.FromMinutes(pi * Profile.HistoryParticipantMinuteStep),
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
        var detPrefs = new DeterministicSeed(Profile.UserPreferencesRandomSeed);
        foreach (var uid in userIds)
        {
            var traits = SeedUserTraits.For(uid, Profile.RandomSeed);
            var notifCut = Math.Clamp(6 - (2 + traits.ConsistencyMillis * 3 / 1000), 0, 5);
            var pubCut = Math.Clamp(9 - (2 + traits.SocialMillis * 4 / 1000), 0, 8);
            db.UserPreferences.Add(new UserPreference
            {
                UserId = uid,
                DefaultBikeType = bikes[detPrefs.PickIndex(bikes.Length, SeedGraph.Salt.UserPreference, uid, 0)],
                DistanceUnit = units[detPrefs.PickIndex(units.Length, SeedGraph.Salt.UserPreference, uid, 1)],
                NotificationsEnabled = detPrefs.Int(0, 6, SeedGraph.Salt.UserPreference, uid, 2) >= notifCut,
                PublicInRouteRiderLists = detPrefs.Int(0, 9, SeedGraph.Salt.UserPreference, uid, 3) >= pubCut,
                ColorScheme = "midnight",
            });
        }
    }
}
