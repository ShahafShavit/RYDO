namespace Rydo.Api.Data;

/// <summary>
/// <para><b>Graph model (conceptual).</b> Vertices: users (admin, primary, community), routes, clubs, rides,
/// challenges, hazards. Directed edges: creator→route, member→club, ride→route/club, participant→ride,
/// history→route/ride, friendship/pending→user. Seeding walks layers in dependency order.</para>
/// <para>All “random” choices are <see cref="DeterministicSeed"/> draws keyed by <see cref="Salt"/> + entity ids/indices
/// so the graph is stable, auditable, and does not depend on <see cref="System.Random"/> call order.</para>
/// </summary>
public static class SeedGraph
{
    /// <summary>Domain tags mixed into <see cref="SeedDeterminism.Mix"/> so unrelated edge generators never collide.</summary>
    public static class Salt
    {
        public const int GroopyRouteCreator = 0x10;
        public const int GroopyRouteCreatedDays = 0x11;
        /// <summary>Mixes with user id to rank publishers for Zipf weights (long-tail route authorship).</summary>
        public const int GroopyRoutePublisherOrder = 0x12;
        public const int SavedRoutePair = 0x20;
        public const int SavedRouteTopUp = 0x21;
        public const int Hazard = 0x30;
        public const int ClubExtraMember = 0x40;
        public const int ClubRideSchedule = 0x50;
        public const int ClubRideParticipantsCap = 0x51;
        public const int PersonalRide = 0x60;
        public const int PersonalRideParticipants = 0x61;
        public const int RideParticipantPick = 0x70;
        public const int VariedParticipation = 0x80;
        public const int ChallengeProgress = 0x90;
        public const int SoloHistory = 0xA0;
        public const int UserPreference = 0xB0;
    }
}
