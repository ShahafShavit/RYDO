using Microsoft.AspNetCore.Identity;

namespace Rydo.Api.Data;

public class ApplicationUser : IdentityUser<int>
{
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public DateTime CreatedAt { get; set; }
}
