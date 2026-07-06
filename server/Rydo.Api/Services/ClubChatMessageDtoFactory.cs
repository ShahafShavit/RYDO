using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;

namespace Rydo.Api.Services;

/// <summary>Builds the club chat message payload used by HTTP responses and SignalR (same shape everywhere).</summary>
public sealed class ClubChatMessageDtoFactory(RydoDbContext db)
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    private static string DisplayName(ApplicationUser? u) =>
        u == null ? "" : string.Join(" ", new[] { u.FirstName, u.LastName }.Where(x => !string.IsNullOrWhiteSpace(x))).Trim();

    private sealed record MentionIn(string Kind, int Id);

    public async Task<object> BuildAsync(ClubChatMessage m, CancellationToken ct)
    {
        var authorName = DisplayName(m.Author);
        var clubNameHint = await db.CyclingClubs.AsNoTracking()
            .Where(c => c.Id == m.ClubId)
            .Select(c => c.Name)
            .FirstOrDefaultAsync(ct) ?? "";
        List<object> mentionObjs = new();
        if (!string.IsNullOrEmpty(m.MentionsJson))
        {
            try
            {
                var raw = JsonSerializer.Deserialize<List<MentionIn>>(m.MentionsJson, JsonOpts);
                if (raw != null)
                {
                    foreach (var x in raw)
                    {
                        var kind = (x.Kind ?? "").ToLowerInvariant();
                        string label;
                        string? userHandle = null;
                        switch (kind)
                        {
                            case "user":
                                {
                                    var u = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == x.Id, ct);
                                    label = u != null ? DisplayName(u) : $"User {x.Id}";
                                    userHandle = u?.Handle;
                                    break;
                                }
                            case "route":
                                label = await db.Routes.AsNoTracking().Where(r => r.Id == x.Id).Select(r => r.Title).FirstOrDefaultAsync(ct) ?? $"Route {x.Id}";
                                break;
                            case "ride":
                                label = await db.Rides.AsNoTracking().Where(r => r.Id == x.Id)
                                    .Select(r => r.Name + " · " + r.ScheduledDate.ToUniversalTime().ToString("yyyy-MM-dd")).FirstOrDefaultAsync(ct) ?? $"Ride {x.Id}";
                                break;
                            default:
                                label = $"#{x.Id}";
                                break;
                        }
                        mentionObjs.Add(userHandle != null
                            ? new { kind, id = x.Id, label, handle = userHandle }
                            : new { kind, id = x.Id, label });
                    }
                }
            }
            catch
            {
                /* ignore bad json */
            }
        }

        return new
        {
            id = m.Id,
            clubId = m.ClubId,
            clubNameHint = clubNameHint,
            authorUserId = m.AuthorUserId,
            authorHandle = m.Author?.Handle ?? "",
            authorDisplayName = authorName,
            authorAvatarUrl = UserPublicFields.RosterAvatarUrl(m.Author),
            body = m.Body,
            mentions = mentionObjs,
            sentAt = m.SentAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
        };
    }
}
