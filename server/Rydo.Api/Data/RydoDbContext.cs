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
    public DbSet<Ride> Rides => Set<Ride>();
    public DbSet<RideParticipant> RideParticipants => Set<RideParticipant>();
    public DbSet<UserPreference> UserPreferences => Set<UserPreference>();
    public DbSet<ChallengeEntity> Challenges => Set<ChallengeEntity>();
    public DbSet<HistoryEntry> HistoryEntries => Set<HistoryEntry>();
    public DbSet<CyclingClub> CyclingClubs => Set<CyclingClub>();
    public DbSet<ClubMember> ClubMembers => Set<ClubMember>();
    public DbSet<ClubInvite> ClubInvites => Set<ClubInvite>();
    public DbSet<ClubChatMessage> ClubChatMessages => Set<ClubChatMessage>();
    public DbSet<ClubChatReadState> ClubChatReadStates => Set<ClubChatReadState>();
    public DbSet<FriendRequest> FriendRequests => Set<FriendRequest>();
    public DbSet<Friendship> Friendships => Set<Friendship>();
    public DbSet<InboxItem> InboxItems => Set<InboxItem>();

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

        builder.Entity<Ride>(e =>
        {
            e.HasOne(x => x.Route).WithMany().HasForeignKey(x => x.RouteId).IsRequired(false).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Club).WithMany(c => c.Rides).HasForeignKey(x => x.ClubId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.CreatedBy).WithMany(u => u.CreatedRides).HasForeignKey(x => x.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
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

        builder.Entity<ClubChatMessage>(e =>
        {
            e.HasOne(x => x.Club).WithMany().HasForeignKey(x => x.ClubId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Author).WithMany().HasForeignKey(x => x.AuthorUserId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => new { x.ClubId, x.SentAt });
        });

        builder.Entity<ClubChatReadState>(e =>
        {
            e.HasKey(x => new { x.ClubId, x.UserId });
            e.HasOne(x => x.Club).WithMany().HasForeignKey(x => x.ClubId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<RideParticipant>(e =>
        {
            e.HasKey(x => new { x.RideId, x.UserId });
            e.HasOne(x => x.Ride).WithMany(g => g.Participants).HasForeignKey(x => x.RideId);
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
            e.HasOne(x => x.Ride).WithMany().HasForeignKey(x => x.RideId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<FriendRequest>(e =>
        {
            e.HasOne(x => x.FromUser).WithMany().HasForeignKey(x => x.FromUserId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.ToUser).WithMany().HasForeignKey(x => x.ToUserId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => new { x.FromUserId, x.ToUserId }).IsUnique();
            e.HasIndex(x => new { x.ToUserId, x.Status });
        });

        builder.Entity<Friendship>(e =>
        {
            e.HasOne(x => x.UserLower).WithMany().HasForeignKey(x => x.UserIdLower).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.UserHigher).WithMany().HasForeignKey(x => x.UserIdHigher).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => new { x.UserIdLower, x.UserIdHigher }).IsUnique();
        });

        builder.Entity<InboxItem>(e =>
        {
            e.HasOne(x => x.Recipient).WithMany().HasForeignKey(x => x.RecipientUserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.FriendRequest).WithMany().HasForeignKey(x => x.FriendRequestId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(x => new { x.RecipientUserId, x.ResolvedAt });
            e.HasIndex(x => new { x.RecipientUserId, x.ReadAt });
        });
    }
}
