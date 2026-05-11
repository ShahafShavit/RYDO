namespace Rydo.Api;

public class TimelapseOptions
{
    public const string SectionName = "Timelapse";

    /// <summary>Root directory for <c>current/track.gpx</c>, <c>current/frames/</c>, <c>current/out/timelapse.mp4</c>. Relative paths are under <see cref="Microsoft.AspNetCore.Hosting.IWebHostEnvironment.ContentRootPath"/>.</summary>
    public string DataPath { get; set; } = "TimelapseData";

    public string RendererUrl { get; set; } = "http://localhost:3001";

    /// <summary>HttpClient timeout for the renderer <c>POST /render</c> call.</summary>
    public int GenerateTimeoutSeconds { get; set; } = 600;
}
