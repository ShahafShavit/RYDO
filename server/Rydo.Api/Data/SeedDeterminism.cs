namespace Rydo.Api.Data;

/// <summary>
/// Stable, portable pseudo-random values derived from a root seed and integer salts.
/// Use instead of <see cref="System.Random"/> so seed data is reproducible and local:
/// changing one entity’s parameters does not reshuffle unrelated draws (when salts include entity keys).
/// </summary>
public static class SeedDeterminism
{
    /// <summary>FNV-1a 32-bit over <paramref name="root"/> and salt words.</summary>
    public static uint Mix(int root, ReadOnlySpan<int> salt)
    {
        unchecked
        {
            uint h = 2166136261;
            h = (h ^ (uint)root) * 16777619;
            for (var i = 0; i < salt.Length; i++)
                h = (h ^ (uint)salt[i]) * 16777619;
            return h;
        }
    }

    public static uint Mix(int root, int a, int b = 0, int c = 0, int d = 0) =>
        Mix(root, stackalloc int[] { a, b, c, d });

    /// <summary>Uniform integer in <c>[min, maxExclusive)</c>; if range empty, returns <paramref name="min"/>.</summary>
    public static int Uniform(int min, int maxExclusive, uint h)
    {
        if (maxExclusive <= min)
            return min;
        var span = (uint)(maxExclusive - min);
        return min + (int)(h % span);
    }

    public static int Uniform(int min, int maxExclusive, int root, ReadOnlySpan<int> salt) =>
        Uniform(min, maxExclusive, Mix(root, salt));

    public static int Uniform(int min, int maxExclusive, int root, int a, int b = 0, int c = 0, int d = 0) =>
        Uniform(min, maxExclusive, Mix(root, stackalloc int[] { a, b, c, d }));

    /// <summary>Double in <c>[0, 1)</c> (53-bit precision; stable for lat/lng jitter).</summary>
    public static double Double01(uint h)
    {
        unchecked
        {
            ulong x = h;
            x = x * 6364136223846793005UL + 1442695040888963407UL;
            return (x >> 11) * (1.0 / (1UL << 53));
        }
    }

    public static double Double01(int root, int a, int b = 0, int c = 0) =>
        Double01(Mix(root, stackalloc int[] { a, b, c }));

    /// <summary>Index in <c>[0, count)</c>; if <paramref name="count"/> ≤ 0, returns 0.</summary>
    public static int PickIndex(int count, uint h) =>
        count <= 0 ? 0 : (int)(h % (uint)count);

    public static int PickIndex(int count, int root, ReadOnlySpan<int> salt) =>
        PickIndex(count, Mix(root, salt));
}

/// <summary>
/// Carries the master seed for one seeding run; all draws should include domain-specific salt ints
/// (entity ids, indices, tags) so the graph stays stable under edits elsewhere.
/// </summary>
public readonly struct DeterministicSeed
{
    public DeterministicSeed(int rootSeed) => Root = rootSeed;

    public int Root { get; }

    public uint Hash(ReadOnlySpan<int> salt) => SeedDeterminism.Mix(Root, salt);

    public uint Hash(int a, int b = 0, int c = 0, int d = 0) =>
        SeedDeterminism.Mix(Root, stackalloc int[] { a, b, c, d });

    public int Int(int min, int maxExclusive, ReadOnlySpan<int> salt) =>
        SeedDeterminism.Uniform(min, maxExclusive, Root, salt);

    public int Int(int min, int maxExclusive, int a, int b = 0, int c = 0, int d = 0) =>
        SeedDeterminism.Uniform(min, maxExclusive, Root, a, b, c, d);

    public double Double01(int a, int b = 0, int c = 0) =>
        SeedDeterminism.Double01(Root, a, b, c);

    public int PickIndex(int count, ReadOnlySpan<int> salt) =>
        SeedDeterminism.PickIndex(count, SeedDeterminism.Mix(Root, salt));

    public int PickIndex(int count, int a, int b = 0, int c = 0) =>
        SeedDeterminism.PickIndex(count, SeedDeterminism.Mix(Root, stackalloc int[] { a, b, c }));

    /// <summary>Deterministic Fisher–Yates shuffle; <paramref name="round"/> distinguishes repeated shuffles of the same list.</summary>
    public void Shuffle<T>(IList<T> list, int domainTag, int round = 0)
    {
        for (var i = list.Count - 1; i > 0; i--)
        {
            var j = Int(0, i + 1, domainTag, round, i, unchecked((int)0x53485546));
            (list[i], list[j]) = (list[j], list[i]);
        }
    }

    /// <summary>Shuffle with extra salt (e.g. user id + pass) so repeated shuffles stay independent.</summary>
    public void Shuffle<T>(IList<T> list, int domainTag, int saltA, int saltB)
    {
        for (var i = list.Count - 1; i > 0; i--)
        {
            var j = Int(0, i + 1, domainTag, saltA, saltB, i);
            (list[i], list[j]) = (list[j], list[i]);
        }
    }
}
