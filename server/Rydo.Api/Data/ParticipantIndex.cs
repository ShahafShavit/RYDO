using Microsoft.EntityFrameworkCore;

namespace Rydo.Api.Data;

/// <summary>
/// In-memory view of <see cref="RideParticipant"/> rows for seeding. Avoids hundreds of thousands of
/// <see cref="DbSet{TEntity}.Find"/> / <c>COUNT</c> queries during nested loops in <see cref="DbSeeder"/>.
/// </summary>
internal sealed class ParticipantIndex
{
    private readonly HashSet<(int RideId, int UserId)> _pairs = new();
    private readonly Dictionary<int, int> _countByRide = new();
    private readonly Dictionary<int, int> _countByUser = new();
    private readonly Dictionary<int, HashSet<int>> _usersByRide = new();

    public static async Task<ParticipantIndex> LoadExistingAsync(
        RydoDbContext db,
        IReadOnlyCollection<int> rideIds,
        CancellationToken cancellationToken = default)
    {
        var idx = new ParticipantIndex();
        if (rideIds.Count == 0)
            return idx;

        var rows = await db.RideParticipants.AsNoTracking()
            .Where(p => rideIds.Contains(p.RideId))
            .Select(p => new { p.RideId, p.UserId })
            .ToListAsync(cancellationToken);

        foreach (var r in rows)
            idx.RegisterPair(r.RideId, r.UserId);

        return idx;
    }

    private bool RegisterPair(int rideId, int userId)
    {
        if (!_pairs.Add((rideId, userId)))
            return false;

        _countByRide[rideId] = _countByRide.GetValueOrDefault(rideId) + 1;
        _countByUser[userId] = _countByUser.GetValueOrDefault(userId) + 1;

        if (!_usersByRide.TryGetValue(rideId, out var set))
        {
            set = [];
            _usersByRide[rideId] = set;
        }

        set.Add(userId);
        return true;
    }

    public bool Has(int rideId, int userId) => _pairs.Contains((rideId, userId));

    public int CountForRide(int rideId) => _countByRide.GetValueOrDefault(rideId);

    public int TotalForUser(int userId) => _countByUser.GetValueOrDefault(userId);

    public bool UserHasAnyParticipantOnRides(int userId, IReadOnlySet<int> rideIds)
    {
        foreach (var rid in rideIds)
        {
            if (Has(rid, userId))
                return true;
        }

        return false;
    }

    /// <summary>Matches prior SQL: ORDER BY UserId.</summary>
    public IReadOnlyList<int> GetUserIdsOnRideOrdered(int rideId) =>
        _usersByRide.TryGetValue(rideId, out var set)
            ? set.OrderBy(u => u).ToList()
            : [];

    public void Add(RydoDbContext db, int rideId, int userId)
    {
        if (!RegisterPair(rideId, userId))
            return;
        db.RideParticipants.Add(new RideParticipant { RideId = rideId, UserId = userId });
    }
}
