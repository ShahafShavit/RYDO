using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Rydo.Api;
using Rydo.Api.Data;
using Rydo.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<RydoOptions>(builder.Configuration.GetSection(RydoOptions.SectionName));

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
});

builder.Services.AddAuthorization();
builder.Services.AddControllers().AddJsonOptions(o =>
{
    o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
});

builder.Services.AddCors(o =>
{
    o.AddDefaultPolicy(p => p
        .AllowAnyHeader()
        .AllowAnyMethod()
        .SetIsOriginAllowed(_ => true));
});

var app = builder.Build();

const int dbMaxAttempts = 24;
for (var attempt = 1; attempt <= dbMaxAttempts; attempt++)
{
    try
    {
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RydoDbContext>();
            await db.Database.EnsureCreatedAsync();
            await db.Database.ExecuteSqlRawAsync("SELECT 1");
            await DbSeeder.SeedAsync(app.Services);
        }

        break;
    }
    catch (Exception) when (attempt < dbMaxAttempts)
    {
        await Task.Delay(TimeSpan.FromSeconds(5));
    }
}

var webRoot = Path.Combine(app.Environment.ContentRootPath, "wwwroot");
var indexHtml = Path.Combine(webRoot, "index.html");
if (File.Exists(indexHtml))
{
    app.UseDefaultFiles();
    app.UseStaticFiles();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

if (File.Exists(indexHtml))
{
    app.MapFallbackToFile("index.html");
}

app.Run();
