using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Rydo.Api.Data;

public class RydoDbContext : IdentityDbContext<ApplicationUser, IdentityRole<int>, int>
{
    public RydoDbContext(DbContextOptions<RydoDbContext> options) : base(options) { }

    public DbSet<RouteEntity> Routes => Set<RouteEntity>();
    public DbSet<SavedRoute> SavedRoutes => Set<SavedRoute>();
    public DbSet<HazardEntity> Hazards => Set<HazardEntity>();
    public DbSet<RideGroup> RideGroups => Set<RideGroup>();
    public DbSet<RideParticipant> RideParticipants => Set<RideParticipant>();
    public DbSet<UserPreference> UserPreferences => Set<UserPreference>();
    public DbSet<ChallengeEntity> Challenges => Set<ChallengeEntity>();
    public DbSet<HistoryEntry> HistoryEntries => Set<HistoryEntry>();
    public DbSet<CyclingClub> CyclingClubs => Set<CyclingClub>();
    public DbSet<ClubMember> ClubMembers => Set<ClubMember>();
    public DbSet<ClubInvite> ClubInvites => Set<ClubInvite>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<SavedRoute>(e =>
        {
            e.HasKey(x => new { x.UserId, x.RouteId });
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Route).WithMany().HasForeignKey(x => x.RouteId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<RouteEntity>(e =>
        {
            e.HasOne(x => x.CreatedBy).WithMany(u => u.CreatedRoutes).HasForeignKey(x => x.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<HazardEntity>(e =>
        {
            e.HasOne(x => x.ReportedBy).WithMany().HasForeignKey(x => x.ReportedByUserId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<RideGroup>(e =>
        {
            e.HasOne(x => x.Route).WithMany().HasForeignKey(x => x.RouteId).IsRequired(false).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Club).WithMany(c => c.RideGroups).HasForeignKey(x => x.ClubId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.CreatedBy).WithMany(u => u.CreatedRideGroups).HasForeignKey(x => x.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<CyclingClub>(e =>
        {
            e.HasOne(x => x.CreatedBy).WithMany().HasForeignKey(x => x.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<ClubMember>(e =>
        {
            e.HasKey(x => new { x.ClubId, x.UserId });
            e.HasOne(x => x.Club).WithMany(c => c.Members).HasForeignKey(x => x.ClubId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<ClubInvite>(e =>
        {
            e.HasIndex(x => x.Token).IsUnique();
            e.HasOne(x => x.Club).WithMany(c => c.Invites).HasForeignKey(x => x.ClubId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.CreatedBy).WithMany().HasForeignKey(x => x.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<RideParticipant>(e =>
        {
            e.HasKey(x => new { x.RideGroupId, x.UserId });
            e.HasOne(x => x.RideGroup).WithMany(g => g.Participants).HasForeignKey(x => x.RideGroupId);
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<UserPreference>(e =>
        {
            e.HasKey(x => x.UserId);
            e.HasOne(x => x.User).WithOne().HasForeignKey<UserPreference>(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<HistoryEntry>(e =>
        {
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Route).WithMany().HasForeignKey(x => x.RouteId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.RideGroup).WithMany().HasForeignKey(x => x.RideGroupId).OnDelete(DeleteBehavior.SetNull);
        });
    }
}
