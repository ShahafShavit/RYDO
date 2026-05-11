using Microsoft.AspNetCore.Identity;

namespace Rydo.Api.Data;

public class ApplicationUser : IdentityUser<int>
{
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public DateTime CreatedAt { get; set; }

    public string? Bio { get; set; }
    public string? Location { get; set; }
    public string? AvatarUrl { get; set; }

    /// <summary>Uploaded square avatar (1:1), WebP. When set, this wins over <see cref="AvatarUrl"/> for display.</summary>
    public byte[]? AvatarImageBytes { get; set; }

    public string? AvatarImageContentType { get; set; }

    /// <summary>Visible to other signed-in users on the public profile.</summary>
    public bool PublicFirstName { get; set; } = true;

    public bool PublicLastName { get; set; } = true;
    public bool PublicEmail { get; set; }
    public bool PublicCreatedAt { get; set; } = true;
    public bool PublicBio { get; set; } = true;
    public bool PublicLocation { get; set; } = true;
    public bool PublicAvatarUrl { get; set; } = true;

    /// <summary>When true, default bike type from preferences may appear on the public profile.</summary>
    public bool PublicDefaultBikeType { get; set; } = true;

    public ICollection<RouteEntity> CreatedRoutes { get; set; } = new List<RouteEntity>();

    public ICollection<Ride> CreatedRides { get; set; } = new List<Ride>();
}
