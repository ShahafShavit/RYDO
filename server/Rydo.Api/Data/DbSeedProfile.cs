namespace Rydo.Api.Data;

/// <summary>
/// Tunable defaults for <see cref="DbSeeder"/>. Adjust counts and ranges here instead of hunting literals in seed methods.
/// Constraints: <see cref="CommunityRiderCount"/> must be at least <c>CyclingClubs × <see cref="AdminsPerClub"/></c> (default 10×2 = 20)
/// so club admin assignment can succeed.
/// Per-user variation uses deterministic <see cref="SeedUserTraits"/> plus <see cref="UserBehaviorSoloSkewStrength"/> /
/// <see cref="UserBehaviorParticipationTraitStrength"/> so demo data is not uniformly distributed.
/// </summary>
public sealed class DbSeedProfile
{
    /// <summary>Primary RNG seed for reproducible demo data.</summary>
    public int RandomSeed { get; init; } = 42;

    /// <summary>Separate seed for per-user preference variety (independent of main seed).</summary>
    public int UserPreferencesRandomSeed { get; init; } = 99;

    /// <summary>First bulk rider email is <c>rider{000}@rydo.test</c> with this numeric part (default 003).</summary>
    public int CommunityRiderEmailStartNumber { get; init; } = 3;

    /// <summary>
    /// How many bulk demo users to create. Names cycle if this exceeds built-in name lists.
    /// Must be at least <c>10 × <see cref="AdminsPerClub"/></c> (default clubs × two admin seats) for <see cref="DbSeeder"/> club seeding.
    /// </summary>
    public int CommunityRiderCount { get; init; } = 34;

    public int CommunityAccountAgeDaysBase { get; init; } = 90;
    public int CommunityAccountAgeDaysStep { get; init; } = 2;

    /// <summary>Routes loaded from GPX seed: random “created” date in the past.</summary>
    public int RouteCreatedDaysAgoMin { get; init; } = 2;
    public int RouteCreatedDaysAgoMaxExclusive { get; init; } = 400;

    /// <summary>When JSON omits length and GPX parsing gives no distance.</summary>
    public double RouteFallbackDistanceKm { get; init; } = 12;

    /// <summary>
    /// Zipf scale for the heaviest route publisher (rank 0 after deterministic shuffle). Larger = more routes
    /// concentrated on a small “power curator” set.
    /// </summary>
    public int RoutePublisherZipfScale { get; init; } = 14_000;

    /// <summary>
    /// Zipf exponent for route authorship weights (<c>w ∝ scale / rank^exp</c>). Higher = sharper long tail
    /// (fewer people publish most routes). Typical range about 1.2–2.0.
    /// </summary>
    public double RoutePublisherZipfExponent { get; init; } = 1.65;

    public int MinSavedRoutesPerUser { get; init; } = 6;

    /// <summary>Upper bound on total user–route saved pairs (spread target).</summary>
    public int MaxSavedRoutePairingsTotal { get; init; } = 280;

    public int SavedRoutesTopUpMaxAttemptsPerUserRoutes { get; init; } = 4;

    public int HazardCount { get; init; } = 46;
    public double HazardBaseLatitude { get; init; } = 32.07;
    public double HazardBaseLongitude { get; init; } = 34.76;
    public int HazardReportedDaysMaxExclusive { get; init; } = 180;

    /// <summary>Seats per club taken from the community pool for paired club admins (seed assigns two admins per club; keep at 2 unless membership seed changes).</summary>
    public int AdminsPerClub { get; init; } = 2;

    /// <summary>Extra active members per club after the admins: <c>base + rnd(0 .. exclusive)</c> (default 4–5).</summary>
    public int ExtraClubMembersBase { get; init; } = 4;
    public int ExtraClubMembersExtraRandMaxExclusive { get; init; } = 4;

    public int ClubMemberActivatedDaysMin { get; init; } = 5;
    public int ClubMemberActivatedDaysMaxExclusive { get; init; } = 70;

    /// <summary>Jerusalem Hills invite link max uses.</summary>
    public int JerusalemInviteMaxUses { get; init; } = 50;

    public int FriendshipCreatedDaysAgo { get; init; } = 14;
    public int FriendRequestCreatedDaysAgo { get; init; } = 2;

    public int ClubChatMemberSampleLimit { get; init; } = 12;
    public int ClubChatThreadStartDayBackMin { get; init; } = 5;
    public int ClubChatThreadStartDayBackExtraMaxExclusive { get; init; } = 5;
    public int ClubChatMessageGapBase { get; init; } = 12;
    public int ClubChatMessageGapSpanMaxExclusive { get; init; } = 120;
    public int ClubChatScenarioModulo { get; init; } = 4;

    public int UpcomingClubRideCount { get; init; } = 3;

    public int ClubRideMaxParticipantsMin { get; init; } = 8;
    public int ClubRideMaxParticipantsSpan { get; init; } = 25;

    public int PersonalRideMaxParticipants { get; init; } = 4;
    public double PersonalPastRideHour { get; init; } = 6.5;
    public double PersonalFutureRideHour { get; init; } = 12.25;

    public int PersonalRideParticipantsMin { get; init; } = 2;
    public int PersonalRideParticipantsMax { get; init; } = 4;

    public int CapMoveToPastDaysBase { get; init; } = 12;
    public int CapPerClubMoveToPastDaysBase { get; init; } = 14;
    public int CapPastHourSpread { get; init; } = 5;

    public int VariedParticipationTargetMin { get; init; } = 14;
    public int VariedParticipationTargetMaxExclusive { get; init; } = 30;
    public int VariedParticipationClubBoostMaxExclusive { get; init; } = 4;
    public int VariedParticipationUidModulo { get; init; } = 5;
    public int VariedParticipationAbsoluteCap { get; init; } = 52;

    public int InitialClubRideParticipantsMin { get; init; } = 2;
    public int InitialClubRideParticipantsMaxExclusive { get; init; } = 15;
    public int InitialClubRideParticipantSpreadModulo { get; init; } = 4;

    public int SoloRidesPerUserMin { get; init; } = 7;
    public int SoloRidesPerUserMaxExclusive { get; init; } = 12;
    public int SoloSparseEveryN { get; init; } = 11;
    public int SoloDurationJitterModulo { get; init; } = 41;
    public int SoloDurationJitterCenter { get; init; } = 20;
    public int SoloMinDurationMinutes { get; init; } = 25;

    /// <summary>After the first week in the streak block, days offset is <c>rnd(0 .. exclusive)</c>.</summary>
    public int SoloWeeklyStreakExtraJitterMaxExclusive { get; init; } = 3;

    public int HistoryDurationJitterModulo { get; init; } = 21;
    public int HistoryDurationJitterCenter { get; init; } = 10;
    public int HistoryDistanceFactorModulo { get; init; } = 11;
    public int HistoryElevationFactorModulo { get; init; } = 9;
    public int HistoryParticipantMinuteStep { get; init; } = 3;
    public int HistoryStartHourOffset { get; init; } = 1;

    /// <summary>When no club rides are in the future, bump one ride this many days ahead.</summary>
    public int EnsureFutureRideWhenEmptyListDays { get; init; } = 14;

    /// <summary>When a user’s clubs have no future rides, promote a past club ride this many days ahead.</summary>
    public int EnsureFutureRidePromoteDays { get; init; } = 10;

    /// <summary>Last resort: assign a club ride into the future by this offset.</summary>
    public int EnsureFutureRideLastResortDays { get; init; } = 12;

    public int EnsureFutureRideHour { get; init; } = 8;

    public int ChallengeElevationProgressBonusMax { get; init; } = 400;
    public int ChallengeDistanceProgressBonusMax { get; init; } = 80;

    /// <summary>How strongly <see cref="SeedUserTraits.ActivityMillis"/> skews solo ride counts toward high/low (larger = more spread).</summary>
    public int UserBehaviorSoloSkewStrength { get; init; } = 72;

    /// <summary>Scales <see cref="SeedUserTraits.SocialMillis"/> effect on club participation targets.</summary>
    public int UserBehaviorParticipationTraitStrength { get; init; } = 14;

    public SeedTimeProfile Time { get; init; } = new();

    /// <summary>Deterministic friend / inbox demo graph over ordered community indices (see <see cref="FriendInboxSeedSpec"/>).</summary>
    public FriendInboxSeedSpec FriendInbox { get; init; } = new();

    public string CommunityRiderEmail(int riderNumber) => $"rider{riderNumber:000}@rydo.test";
}

/// <summary>Date ranges and caps for scheduled rides and solo history (club vs personal spacing).</summary>
public sealed class SeedTimeProfile
{
    public (int Min, int Max) ClubPastRecentDays { get; init; } = (2, 21);
    public (int Min, int Max) ClubPastMidDays { get; init; } = (21, 75);
    public (int Min, int Max) ClubPastOlderDays { get; init; } = (75, 260);
    public int ClubUpcomingStartDays { get; init; } = 3;
    public int ClubUpcomingCadenceDays { get; init; } = 5;
    public int ClubUpcomingHourMin { get; init; } = 6;
    public int ClubUpcomingHourMaxExclusive { get; init; } = 18;
    public int MaxUpcomingTotal { get; init; } = 8;
    public int MaxUpcomingPerClub { get; init; } = 3;

    public int PersonalPastDays { get; init; } = 10;
    public int PersonalFutureDays { get; init; } = 4;

    public (int Min, int Max) SoloHistoryCurrentWeekDays { get; init; } = (0, 2);
    public (int Min, int Max) SoloHistoryRecentDays { get; init; } = (1, 6);
    public (int Min, int Max) SoloHistoryMidDays { get; init; } = (7, 28);
    public (int Min, int Max) SoloHistoryOlderDays { get; init; } = (29, 220);
    public int GuaranteedWeeklyStreakWeeks { get; init; } = 6;
}
