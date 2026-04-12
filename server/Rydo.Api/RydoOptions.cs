using Rydo.Api.Data;

namespace Rydo.Api;

public class RydoOptions
{
    public const string SectionName = "Rydo";

    /// <summary>Routes created by a deleted user are reassigned to this account.</summary>
    public string SystemAdminEmail { get; set; } = DbSeeder.AdminEmail;
}
