namespace Rydo.Api.Data;

/// <summary>Mutual friendship with canonical ordering: <see cref="UserIdLower"/> &lt; <see cref="UserIdHigher"/>.</summary>
public class Friendship
{
    public int Id { get; set; }
    public int UserIdLower { get; set; }
    public ApplicationUser? UserLower { get; set; }
    public int UserIdHigher { get; set; }
    public ApplicationUser? UserHigher { get; set; }
    public DateTime CreatedAt { get; set; }
}
