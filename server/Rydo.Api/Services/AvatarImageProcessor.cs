using System.Security.Cryptography;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;

namespace Rydo.Api.Services;

public static class AvatarImageProcessor
{
    public const int MaxUploadBytes = 2 * 1024 * 1024;
    public const int MaxStoredBytes = 524_288;
    public const int MinSquarePx = 64;
    public const int MaxSquarePx = 2048;

    /// <summary>Decode, require 1:1 square, re-encode WebP. Returns null and error message on failure.</summary>
    public static (byte[]? Bytes, string ContentType, string? Error) TryProcessUpload(ReadOnlySpan<byte> raw)
    {
        if (raw.Length == 0)
            return (null, "", "File is empty.");
        if (raw.Length > MaxUploadBytes)
            return (null, "", $"Image must be at most {MaxUploadBytes / (1024 * 1024)} MB.");

        try
        {
            using var image = Image.Load(raw);
            if (image.Width != image.Height)
                return (null, "", "Image must be square (1:1 aspect ratio).");
            if (image.Width < MinSquarePx || image.Height < MinSquarePx)
                return (null, "", $"Image must be at least {MinSquarePx}×{MinSquarePx} pixels.");
            if (image.Width > MaxSquarePx || image.Height > MaxSquarePx)
                return (null, "", $"Image must be at most {MaxSquarePx}×{MaxSquarePx} pixels.");

            using var ms = new MemoryStream();
            image.Save(ms, new WebpEncoder { Quality = 85 });
            var bytes = ms.ToArray();
            if (bytes.Length > MaxStoredBytes)
                return (null, "", "Processed image is too large; try a smaller source image.");
            return (bytes, "image/webp", null);
        }
        catch (UnknownImageFormatException)
        {
            return (null, "", "Unsupported or corrupted image format.");
        }
    }

    public static string ETagForBytes(byte[] bytes)
    {
        var hash = SHA256.HashData(bytes);
        return "\"" + Convert.ToHexString(hash)[..16] + "\"";
    }
}
