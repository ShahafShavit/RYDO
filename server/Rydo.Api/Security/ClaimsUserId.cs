using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace Rydo.Api.Security;

public static class ClaimsUserId
{
    public static int FromPrincipal(ClaimsPrincipal user)
    {
        var s = user.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? user.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return int.TryParse(s, out var id) ? id : 0;
    }
}
