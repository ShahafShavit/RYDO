using Rydo.Api.Data;

namespace Rydo.Api.Services;

public static class ClubRidePolicy
{
    public static bool CanCreateRide(ClubRideCreationPolicy policy, ClubMemberRole role, ClubMembershipStatus status)
    {
        if (status != ClubMembershipStatus.Active) return false;

        return policy switch
        {
            ClubRideCreationPolicy.Everyone => true,
            ClubRideCreationPolicy.OrganizersAndAdmins =>
                role is ClubMemberRole.Admin or ClubMemberRole.Organizer,
            ClubRideCreationPolicy.AdminsOnly => role == ClubMemberRole.Admin,
            _ => false,
        };
    }

    public static string ToApiString(ClubRideCreationPolicy policy) => policy switch
    {
        ClubRideCreationPolicy.OrganizersAndAdmins => "organizersAndAdmins",
        ClubRideCreationPolicy.AdminsOnly => "adminsOnly",
        _ => "everyone",
    };

    public static string RoleToApiString(ClubMemberRole role) => role switch
    {
        ClubMemberRole.Admin => "admin",
        ClubMemberRole.Organizer => "organizer",
        _ => "member",
    };

    public static string MembershipToApiString(ClubMember? mem)
    {
        if (mem == null) return "none";
        if (mem.MembershipStatus == ClubMembershipStatus.Pending) return "pending";
        return RoleToApiString(mem.Role);
    }
}
