namespace Rydo.Api.Data;

public enum ClubVisibility
{
    Public = 0,
    Private = 1,
}

public enum ClubMemberRole
{
    Member = 0,
    Admin = 1,
    Organizer = 2,
}

public enum ClubRideCreationPolicy
{
    Everyone = 0,
    OrganizersAndAdmins = 1,
    AdminsOnly = 2,
}

public enum ClubMembershipStatus
{
    Pending = 0,
    Active = 1,
}
