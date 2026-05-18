using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Rydo.Api.Data;

namespace Rydo.Api.Controllers;

[ApiController]
[Route("api/timelapse")]
public class TimelapseController : ControllerBase
{
    private const string HttpClientName = "TimelapseRenderer";
    private readonly TimelapseOptions _options;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IWebHostEnvironment _env;

    public TimelapseController(
        IOptions<TimelapseOptions> options,
        IHttpClientFactory httpClientFactory,
        IWebHostEnvironment env)
    {
        _options = options.Value;
        _httpClientFactory = httpClientFactory;
        _env = env;
    }

    private string ResolvedDataRoot
    {
        get
        {
            var p = _options.DataPath.Trim();
            if (string.IsNullOrEmpty(p))
                p = "TimelapseData";
            return Path.IsPathRooted(p) ? p : Path.GetFullPath(Path.Combine(_env.ContentRootPath, p));
        }
    }

    private static string CurrentDir(string root) => Path.Combine(root, "current");

    /// <summary>Upload GPX, write to shared timelapse workspace, call headless renderer (which calls encoder). Overwrites previous output.</summary>
    [HttpPost("generate")]
    [AllowAnonymous]
    [RequestSizeLimit(52_428_800)]
    public async Task<IActionResult> Generate(
        [FromForm] IFormFile? gpxFile,
        [FromForm] int? targetDurationSeconds = null,
        [FromForm] int? fps = null,
        [FromForm] string? visualJson = null,
        CancellationToken ct = default)
    {
        if (gpxFile == null || gpxFile.Length == 0)
            return Problem(statusCode: 400, detail: "gpxFile is required.");

        await using var ms = new MemoryStream();
        await gpxFile.CopyToAsync(ms, ct);
        var bytes = ms.ToArray();

        if (!GpxTrackParser.TryParse(bytes, out _, out _, out _, out _, out _, out _, out _))
            return Problem(statusCode: 400, detail: "GPX must contain a readable track with at least two points.");

        if (!GpxTrackParser.IsTrackPlausible(bytes, out var rejectReason))
            return Problem(statusCode: 400, detail: rejectReason ?? "This GPX file failed validation.");

        var root = ResolvedDataRoot;
        var cur = CurrentDir(root);
        Directory.CreateDirectory(cur);
        Directory.CreateDirectory(Path.Combine(cur, "frames"));
        Directory.CreateDirectory(Path.Combine(cur, "out"));

        var trackPath = Path.Combine(cur, "track.gpx");
        await System.IO.File.WriteAllBytesAsync(trackPath, bytes, ct);

        var visualPath = Path.Combine(cur, "timelapse-visual.json");
        var visualPayload = string.IsNullOrWhiteSpace(visualJson) ? "{}" : visualJson.Trim();
        if (visualPayload.Length > 32_768)
            return Problem(statusCode: 400, detail: "visualJson is too large.");
        await System.IO.File.WriteAllTextAsync(visualPath, visualPayload, ct);

        var client = _httpClientFactory.CreateClient(HttpClientName);
        const int durationDefault = 60;
        var wallSec = targetDurationSeconds is >= 30 and <= 120
            ? targetDurationSeconds.Value
            : durationDefault;
        var body = new RendererRenderRequest
        {
            TargetDurationSeconds = wallSec,
            Fps = fps is >= 12 and <= 60 ? fps.Value : 30,
            Width = 720,
            Height = 1280,
        };

        HttpResponseMessage res;
        try
        {
            res = await client.PostAsJsonAsync("render", body, ct);
        }
        catch (Exception ex)
        {
            return Problem(statusCode: 502, detail: $"Renderer unreachable: {ex.Message}");
        }

        if (!res.IsSuccessStatusCode)
        {
            var err = await res.Content.ReadAsStringAsync(ct);
            return Problem(statusCode: (int)res.StatusCode, detail: err);
        }

        return Ok(new { ok = true });
    }

    /// <summary>Poll while <c>POST /generate</c> runs — forwards to the renderer&apos;s <c>GET /render/progress</c>.</summary>
    [HttpGet("render-progress")]
    [AllowAnonymous]
    public async Task<IActionResult> RenderProgress(CancellationToken ct)
    {
        var client = _httpClientFactory.CreateClient(HttpClientName);
        HttpResponseMessage res;
        try
        {
            res = await client.GetAsync("render/progress", ct);
        }
        catch (Exception ex)
        {
            return Problem(statusCode: 503, detail: $"Renderer unreachable: {ex.Message}");
        }

        var body = await res.Content.ReadAsStringAsync(ct);
        return new ContentResult
        {
            Content = body,
            ContentType = "application/json",
            StatusCode = (int)res.StatusCode,
        };
    }

    [HttpGet("video")]
    [AllowAnonymous]
    public IActionResult Video()
    {
        var path = Path.Combine(CurrentDir(ResolvedDataRoot), "out", "timelapse.mp4");
        if (!System.IO.File.Exists(path))
            return NotFound();

        return PhysicalFile(path, "video/mp4", enableRangeProcessing: true);
    }

    private sealed class RendererRenderRequest
    {
        [JsonPropertyName("targetDurationSeconds")]
        public int TargetDurationSeconds { get; init; }

        [JsonPropertyName("fps")]
        public int Fps { get; init; }

        [JsonPropertyName("width")]
        public int Width { get; init; }

        [JsonPropertyName("height")]
        public int Height { get; init; }
    }
}
