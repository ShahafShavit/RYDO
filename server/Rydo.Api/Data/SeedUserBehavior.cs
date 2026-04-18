namespace Rydo.Api.Data;

/// <summary>
/// Per-user behavioral axes (0–1000 each), derived deterministically from <paramref name="userId"/> so the
/// same user always gets the same “personality” for a given root seed. Used to break uniform distributions
/// (e.g. a few power users with many saves / club rides, more casual users with fewer).
/// </summary>
public readonly struct SeedUserTraits
{
    /// <summary>Volume of solo logging / saved routes — high = more rides and bookmarks.</summary>
    public int ActivityMillis { get; init; }

    /// <summary>Club / group engagement — high = higher club participation targets.</summary>
    public int SocialMillis { get; init; }

    /// <summary>Logging regularity — high = fewer “sparse” history rows, stronger notification defaults.</summary>
    public int ConsistencyMillis { get; init; }

    /// <summary>Exploration / reporting — high = slightly more hazard reports in weighted picks.</summary>
    public int ExplorerMillis { get; init; }

    public static SeedUserTraits For(int userId, int rootSeed) =>
        new()
        {
            ActivityMillis = (int)(SeedDeterminism.Mix(rootSeed, 0x1A43_5449, userId) % 1000),
            SocialMillis = (int)(SeedDeterminism.Mix(rootSeed, 0x1B53_4F43, userId) % 1000),
            ConsistencyMillis = (int)(SeedDeterminism.Mix(rootSeed, 0x1C43_4E53, userId) % 1000),
            ExplorerMillis = (int)(SeedDeterminism.Mix(rootSeed, 0x1D45_5850, userId) % 1000),
        };
}

/// <summary>Deterministic weighted picks and mild skews for “natural” demo histograms.</summary>
public static class SeedBehaviorWeights
{
    /// <summary>Minimum weight so everyone stays in the support of weighted picks.</summary>
    public const int MinUserWeight = 120;

    /// <summary>Weight for saved-route pair sampling: higher <see cref="SeedUserTraits.ActivityMillis"/> → more saved pairs.</summary>
    public static int SavedRouteWeight(SeedUserTraits t) => MinUserWeight + t.ActivityMillis;

    /// <summary>Weight for hazard reporter sampling: higher <see cref="SeedUserTraits.ExplorerMillis"/> → more reports.</summary>
    public static int HazardReporterWeight(SeedUserTraits t) => MinUserWeight + t.ExplorerMillis;

    /// <summary>
    /// Picks index in <c>0 .. count-1</c> with probability proportional to <paramref name="weights"/>.
    /// </summary>
    public static int PickWeightedIndex(IReadOnlyList<int> weights, DeterministicSeed det, int domainTag, int step, int subSalt)
    {
        long total = 0;
        for (var i = 0; i < weights.Count; i++)
            total += Math.Max(1, weights[i]);

        if (total <= 0)
            return 0;

        var pick = (long)(SeedDeterminism.Mix(det.Root, domainTag, step, subSalt) % (ulong)total);
        long acc = 0;
        for (var i = 0; i < weights.Count; i++)
        {
            acc += Math.Max(1, weights[i]);
            if (pick < acc)
                return i;
        }

        return weights.Count - 1;
    }

    /// <summary>
    /// Nudges a uniform draw toward low or high end of <c>[min, maxExclusive)</c> based on <paramref name="traitMillis"/>.
    /// <paramref name="traitMillis"/> 500 ≈ neutral; 0 pulls down; 1000 pulls up. Strength scales with <paramref name="skewStrength"/>.
    /// </summary>
    public static int SkewExclusiveRange(int min, int maxExclusive, int uniformValue, int traitMillis, int skewStrength)
    {
        if (maxExclusive <= min + 1)
            return min;

        var span = maxExclusive - min - 1;
        if (span <= 0)
            return min;

        // Integer-safe: (trait - 500) in [-500,500]; scale by span so skew is visible without floating point.
        var adjust = (traitMillis - 500) * skewStrength * span / 50_000;
        var v = uniformValue + adjust;
        if (v < min)
            return min;
        if (v >= maxExclusive)
            return maxExclusive - 1;
        return v;
    }

    /// <summary>Varied club participation target adjustment from social trait (roughly ±few rides).</summary>
    public static int ParticipationTargetDelta(SeedUserTraits t, int strength) => (t.SocialMillis - 500) * strength / 500;

    /// <summary>Sparse history: higher consistency → longer period between sparse rows (less sparse).</summary>
    public static int SoloSparseModulo(int baseMod, SeedUserTraits t)
    {
        var n = baseMod + (500 - t.ConsistencyMillis) / 80;
        return Math.Clamp(n, 5, 24);
    }
}
