using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Rydo.Api.Data;
using Rydo.Api.Services;

namespace Rydo.Api.Controllers;

[ApiController]
[Route("auth")]
public class AuthController(UserManager<ApplicationUser> users, JwtTokenService jwt) : ControllerBase
{
    public record LoginRequest(string Email, string Password);
    public record RegisterRequest(string FirstName, string LastName, string Email, string Password);

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest body)
    {
        var user = await users.FindByEmailAsync(body.Email);
        if (user == null || !await users.CheckPasswordAsync(user, body.Password))
            return Problem(statusCode: 401, title: "Unauthorized", detail: "Invalid email or password.");

        var roles = await users.GetRolesAsync(user);
        var token = jwt.CreateToken(user, roles);
        return Ok(AuthResponse(user, token, roles));
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] RegisterRequest body)
    {
        var user = new ApplicationUser
        {
            UserName = body.Email,
            Email = body.Email,
            EmailConfirmed = true,
            FirstName = body.FirstName,
            LastName = body.LastName,
            CreatedAt = DateTime.UtcNow,
        };
        var result = await users.CreateAsync(user, body.Password);
        if (!result.Succeeded)
            return Problem(statusCode: 400, title: "Validation failed", detail: string.Join("; ", result.Errors.Select(e => e.Description)));

        await users.AddToRoleAsync(user, "user");
        var roles = await users.GetRolesAsync(user);
        var token = jwt.CreateToken(user, roles);
        return Ok(AuthResponse(user, token, roles));
    }

    private static object AuthResponse(ApplicationUser user, string token, IList<string> roles)
    {
        var role = roles.Contains("admin", StringComparer.OrdinalIgnoreCase) ? "admin" : "user";
        return new
        {
            token,
            user = new
            {
                id = user.Id,
                firstName = user.FirstName,
                lastName = user.LastName,
                email = user.Email,
                role,
                isActive = true,
                createdAt = user.CreatedAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
            },
        };
    }
}
