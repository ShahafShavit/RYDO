using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;

namespace Rydo.Api.Services;

public sealed class LiveEntryBoothTokenService(IOptionsMonitor<DemoLiveEntryOptions> options)
{
    private const string RideKey = "live-entry";

    public string Sign(DateTime? expiresUtc = null)
    {
        var opt = options.CurrentValue;
        var exp = expiresUtc ?? DateTime.UtcNow.AddDays(opt.BoothTokenTtlDays);
        var payload = $"{RideKey}|{exp.ToUniversalTime():O}";
        var sig = ComputeHmac(payload, opt.BoothSigningKey);
        var raw = $"{payload}|{sig}";
        return Base64UrlEncode(Encoding.UTF8.GetBytes(raw));
    }

    public bool TryValidate(string? token, out DateTime expiresUtc)
    {
        expiresUtc = default;
        if (string.IsNullOrWhiteSpace(token)) return false;

        byte[] bytes;
        try
        {
            bytes = Base64UrlDecode(token.Trim());
        }
        catch
        {
            return false;
        }

        var raw = Encoding.UTF8.GetString(bytes);
        var parts = raw.Split('|');
        if (parts.Length != 3) return false;
        if (!string.Equals(parts[0], RideKey, StringComparison.Ordinal)) return false;
        if (!DateTime.TryParse(parts[1], null, System.Globalization.DateTimeStyles.RoundtripKind, out var exp)) return false;
        expiresUtc = exp.ToUniversalTime();

        var payload = $"{parts[0]}|{parts[1]}";
        var expected = ComputeHmac(payload, options.CurrentValue.BoothSigningKey);
        if (!CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(expected),
                Encoding.UTF8.GetBytes(parts[2])))
            return false;

        return expiresUtc >= DateTime.UtcNow;
    }

    private static string ComputeHmac(string payload, string key)
    {
        if (string.IsNullOrEmpty(key))
            throw new InvalidOperationException("Booth signing key is not configured.");
        var keyBytes = Encoding.UTF8.GetBytes(key);
        var payloadBytes = Encoding.UTF8.GetBytes(payload);
        var hash = HMACSHA256.HashData(keyBytes, payloadBytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    private static string Base64UrlEncode(byte[] data) =>
        Convert.ToBase64String(data).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static byte[] Base64UrlDecode(string s)
    {
        s = s.Replace('-', '+').Replace('_', '/');
        switch (s.Length % 4)
        {
            case 2: s += "=="; break;
            case 3: s += "="; break;
        }
        return Convert.FromBase64String(s);
    }
}
