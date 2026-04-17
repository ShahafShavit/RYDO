using Rydo.Api.Data;
using Rydo.Api.Models;

namespace Rydo.Api.Services;

public static class UserProfileResponse
{
    private static string IsoUtc(DateTime dt) =>
        dt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ");

    private static object[] SerializeBadges(IReadOnlyList<LeaderboardBadgeDto> badges) =>
        badges.Select(b => new { boardId = b.BoardId, rank = b.Rank }).ToArray();

    public static object Full(
        ApplicationUser u,
        IList<string> roles,
        UserPreference? pref,
        IReadOnlyList<LeaderboardBadgeDto> leaderboardBadges)
    {
        var role = roles.Contains("admin", StringComparer.OrdinalIgnoreCase) ? "admin" : "user";
        return new
        {
            id = u.Id,
            firstName = u.FirstName,
            lastName = u.LastName,
            email = u.Email,
            bio = u.Bio,
            location = u.Location,
            avatarUrl = u.AvatarUrl,
            defaultBikeType = pref?.DefaultBikeType ?? "road",
            role,
            isActive = true,
            createdAt = IsoUtc(u.CreatedAt),
            privacy = new
            {
                publicFirstName = u.PublicFirstName,
                publicLastName = u.PublicLastName,
                publicEmail = u.PublicEmail,
                publicCreatedAt = u.PublicCreatedAt,
                publicBio = u.PublicBio,
                publicLocation = u.PublicLocation,
                publicAvatarUrl = u.PublicAvatarUrl,
                publicDefaultBikeType = u.PublicDefaultBikeType,
                publicUploadedRoutesOnProfile = pref?.PublicUploadedRoutesOnProfile ?? true,
                publicParticipatedRidesOnProfile = pref?.PublicParticipatedRidesOnProfile ?? true,
                publicFriendsListOnProfile = pref?.PublicFriendsListOnProfile ?? true,
                publicInOthersFriendsLists = pref?.PublicInOthersFriendsLists ?? true,
            },
            leaderboardBadges = SerializeBadges(leaderboardBadges),
        };
    }

    /// <summary>Profile visible to another signed-in user (subject is not the viewer).</summary>
    public static object PublicView(
        ApplicationUser u,
        UserPreference? pref,
        IReadOnlyList<LeaderboardBadgeDto> leaderboardBadges)
    {
        return new
        {
            id = u.Id,
            isSelf = false,
            firstName = u.PublicFirstName ? u.FirstName : null,
            lastName = u.PublicLastName ? u.LastName : null,
            email = u.PublicEmail ? u.Email : null,
            createdAt = u.PublicCreatedAt ? IsoUtc(u.CreatedAt) : null,
            bio = u.PublicBio ? u.Bio : null,
            location = u.PublicLocation ? u.Location : null,
            avatarUrl = u.PublicAvatarUrl ? u.AvatarUrl : null,
            defaultBikeType = u.PublicDefaultBikeType && pref != null ? pref.DefaultBikeType : null,
            publicUploadedRoutesOnProfile = pref?.PublicUploadedRoutesOnProfile ?? true,
            publicParticipatedRidesOnProfile = pref?.PublicParticipatedRidesOnProfile ?? true,
            publicFriendsListOnProfile = pref?.PublicFriendsListOnProfile ?? true,
            leaderboardBadges = SerializeBadges(leaderboardBadges),
        };
    }
}
