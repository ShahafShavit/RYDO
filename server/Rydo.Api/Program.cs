using System.Text;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Rydo.Api;
using Rydo.Api.Data;
using Rydo.Api.Hubs;
using Rydo.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<RydoOptions>(builder.Configuration.GetSection(RydoOptions.SectionName));
builder.Services.Configure<DemoClubChatSimulatorOptions>(
    builder.Configuration.GetSection(DemoClubChatSimulatorOptions.SectionName));
builder.Services.AddScoped<ClubChatMessageDtoFactory>();
builder.Services.AddScoped<ILeaderboardService, LeaderboardService>();

var conn = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Server=localhost,1433;Database=Rydo;User Id=sa;Password=Your_password123;TrustServerCertificate=True;Encrypt=False";

builder.Services.AddDbContext<RydoDbContext>(options =>
    options.UseSqlServer(conn));

builder.Services
    .AddIdentity<ApplicationUser, IdentityRole<int>>(options =>
    {
        options.Password.RequiredLength = 6;
        options.User.RequireUniqueEmail = true;
        options.SignIn.RequireConfirmedEmail = false;
    })
    .AddEntityFrameworkStores<RydoDbContext>()
    .AddDefaultTokenProviders();

var jwtKey = builder.Configuration["Jwt:Key"] ?? "rydo-dev-secret-key-min-32-chars-long!!";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "rydo";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "rydo-client";

builder.Services.AddSingleton<JwtTokenService>();

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
}).AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        RoleClaimType = System.Security.Claims.ClaimTypes.Role,
    };
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                context.Token = accessToken;
            return Task.CompletedTask;
        },
    };
});

builder.Services.AddAuthorization();
builder.Services.AddSignalR();
builder.Services.AddControllers().AddJsonOptions(o =>
{
    o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
});

// SignalR negotiate uses cross-origin fetch with credentials; AllowCredentials requires a reflected
// origin (SetIsOriginAllowed / WithOrigins), not AllowAnyOrigin.
builder.Services.AddCors(o =>
{
    o.AddDefaultPolicy(p => p
        .AllowAnyHeader()
        .AllowAnyMethod()
        .SetIsOriginAllowed(_ => true)
        .AllowCredentials());
});

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedProto | ForwardedHeaders.XForwardedHost;
    // ECS tasks are only reachable from the ALB (same SG); allow forwarded headers from that hop.
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

builder.Services.AddHostedService<DatabaseSeederBackgroundService>();
builder.Services.AddHostedService<ClubChatSimulatorBackgroundService>();

var app = builder.Build();

app.UseForwardedHeaders();

var webRoot = Path.Combine(app.Environment.ContentRootPath, "wwwroot");
var indexHtml = Path.Combine(webRoot, "index.html");

static string GetPublicSiteOrigin(HttpContext context)
{
    // CloudFront adds this on the origin request (see infra CDK). Viewer URL is HTTPS while CF→ALB is HTTP.
    var fromCf = context.Request.Headers["X-Rydo-Public-Origin-Proto"].FirstOrDefault();
    if (!string.IsNullOrEmpty(fromCf))
    {
        return $"{fromCf.Trim()}://{context.Request.Host.Value}";
    }

    // After UseForwardedHeaders, Scheme reflects X-Forwarded-Proto when the ALB sends it.
    var scheme = context.Request.Scheme;
    if (string.Equals(scheme, "http", StringComparison.OrdinalIgnoreCase)
        && context.Request.Host.Host.EndsWith(".cloudfront.net", StringComparison.OrdinalIgnoreCase))
    {
        scheme = "https";
    }

    return $"{scheme}://{context.Request.Host.Value}";
}

Func<HttpContext, Task>? serveSpa = null;
if (File.Exists(indexHtml))
{
    serveSpa = async context =>
    {
        context.Response.ContentType = "text/html; charset=utf-8";
        var html = await File.ReadAllTextAsync(indexHtml);
        var origin = GetPublicSiteOrigin(context);
        html = html.Replace("%SITE_ORIGIN%", origin, StringComparison.Ordinal);
        await context.Response.WriteAsync(html);
    };

    app.UseStaticFiles();
    app.MapGet("/", serveSpa);
    app.MapGet("/index.html", serveSpa);
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<ClubChatHub>("/hubs/club-chat");
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

if (serveSpa is not null)
{
    app.MapFallback(serveSpa);
}

app.Run();
