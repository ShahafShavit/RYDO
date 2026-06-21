using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Rydo.Api;
using Rydo.Api.Data;
using Rydo.Api.Hubs;
using Rydo.Api.Middleware;
using Rydo.Api.Services;
using Rydo.Api.Services.RideLive;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<RydoOptions>(builder.Configuration.GetSection(RydoOptions.SectionName));
builder.Services.Configure<TimelapseOptions>(builder.Configuration.GetSection(TimelapseOptions.SectionName));
builder.Services.Configure<DemoClubChatSimulatorOptions>(
    builder.Configuration.GetSection(DemoClubChatSimulatorOptions.SectionName));
builder.Services.Configure<DemoRideLiveBotsOptions>(
    builder.Configuration.GetSection(DemoRideLiveBotsOptions.SectionName));
builder.Services.AddOptions<DemoLiveEntryOptions>()
    .Bind(builder.Configuration.GetSection(DemoLiveEntryOptions.SectionName))
    .PostConfigure<IHostEnvironment>((opt, env) =>
    {
        if (env.IsDevelopment() && string.IsNullOrWhiteSpace(opt.BoothSigningKey))
            opt.BoothSigningKey = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
    });
builder.Services.AddScoped<ClubChatMessageDtoFactory>();
builder.Services.AddSingleton<RideChatMessageDtoFactory>();
builder.Services.AddScoped<ILeaderboardService, LeaderboardService>();
builder.Services.AddScoped<IUserLifetimeStatsService, UserLifetimeStatsService>();
builder.Services.AddScoped<IGamificationService, GamificationService>();
builder.Services.AddScoped<IHistoryMaterializationService, HistoryMaterializationService>();
builder.Services.AddScoped<IUserHandleService, UserHandleService>();
builder.Services.AddScoped<IAdminEngagementAnalyticsService, AdminEngagementAnalyticsService>();
builder.Services.AddSingleton<IUserActivityRecorder, UserActivityRecorder>();
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<RideLivePoseStore>();
builder.Services.AddSingleton<RideLiveRateLimiter>();
builder.Services.AddSingleton<RideLiveBotOrchestrator>();
builder.Services.AddSingleton<LiveEntryBoothTokenService>();
builder.Services.AddScoped<RideParticipantService>();
builder.Services.AddScoped<LiveEntryService>();

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy(Rydo.Api.Controllers.LiveEntryController.RateLimitPolicy, context =>
    {
        var opt = context.RequestServices.GetRequiredService<Microsoft.Extensions.Options.IOptionsMonitor<DemoLiveEntryOptions>>().CurrentValue;
        var window = TimeSpan.FromHours(Math.Max(1, opt.RateLimitWindowHours));
        var partitionKey = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(partitionKey, _ => new FixedWindowRateLimiterOptions
        {
            AutoReplenishment = true,
            PermitLimit = Math.Max(1, opt.RateLimitPermitLimit),
            Window = window,
            QueueLimit = 0,
        });
    });
});

var conn = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Server=localhost,1433;Database=Rydo;User Id=sa;Password=Your_password123;TrustServerCertificate=True;Encrypt=False";

builder.Services.AddDbContext<RydoDbContext>(options =>
    options.UseSqlServer(conn));

builder.Services.AddHttpClient("RideLiveBots", (sp, client) =>
{
    var cfg = sp.GetRequiredService<IConfiguration>();
    var opt = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<DemoRideLiveBotsOptions>>().Value;
    var baseUrl = RideLiveSelfApiBaseUrl.Resolve(cfg, opt);
    client.BaseAddress = new Uri(baseUrl + "/");
});

builder.Services.AddHttpClient("TimelapseRenderer", (sp, client) =>
{
    var opt = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<TimelapseOptions>>().Value;
    var baseUrl = opt.RendererUrl.Trim().TrimEnd('/');
    if (string.IsNullOrEmpty(baseUrl))
        baseUrl = "http://localhost:3001";
    client.BaseAddress = new Uri(baseUrl + "/");
    client.Timeout = TimeSpan.FromSeconds(Math.Max(60, opt.GenerateTimeoutSeconds));
});

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

builder.Services.AddSingleton<IHubFilter, UserActivityHubFilter>();
builder.Services.AddAuthorization();
builder.Services.AddSignalR().AddJsonProtocol(o =>
{
    o.PayloadSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
});
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
builder.Services.AddHostedService<HistoryMaterializationBackgroundService>();
builder.Services.AddHostedService<UserActivityRetentionBackgroundService>();

var app = builder.Build();

var liveEntryOptions = app.Services.GetRequiredService<Microsoft.Extensions.Options.IOptions<DemoLiveEntryOptions>>().Value;
if (liveEntryOptions.Enabled && string.IsNullOrWhiteSpace(liveEntryOptions.BoothSigningKey))
{
    throw new InvalidOperationException(
        "Rydo:LiveEntry:BoothSigningKey is required when LiveEntry is enabled outside Development.");
}

if (app.Environment.IsDevelopment() && liveEntryOptions.Enabled)
{
    var logger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("LiveEntry");
    logger.LogWarning(
        "Live entry booth signing key (Development): {Key}. Pin in appsettings.Development.json to keep QR URLs stable across restarts.",
        liveEntryOptions.BoothSigningKey);
}

await DatabaseBootstrap.EnsureSchemaReadyAsync(
    app.Services,
    app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("DatabaseBootstrap"));

await using (var scope = app.Services.CreateAsyncScope())
{
    var liveEntry = scope.ServiceProvider.GetRequiredService<LiveEntryService>();
    await liveEntry.EnsureStateRowAsync(CancellationToken.None);
}

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
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<UserActivityMiddleware>();

app.MapControllers();
app.MapHub<ClubChatHub>("/hubs/club-chat");
app.MapHub<RideChatHub>("/hubs/ride-chat");
app.MapHub<RideLiveHub>("/hubs/ride-live");
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

if (serveSpa is not null)
{
    app.MapFallback(serveSpa);
}

app.Run();
