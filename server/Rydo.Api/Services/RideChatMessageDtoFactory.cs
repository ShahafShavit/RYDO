using Rydo.Api.Data;

namespace Rydo.Api.Services;

/// <summary>Builds ride chat message payloads for HTTP and SignalR.</summary>
public sealed class RideChatMessageDtoFactory
{
    private static string DisplayName(ApplicationUser? u) =>
        u == null ? "" : string.Join(" ", new[] { u.FirstName, u.LastName }.Where(x => !string.IsNullOrWhiteSpace(x))).Trim();

    public object Build(RideChatMessage m) => new
    {
        id = m.Id,
        rideId = m.RideId,
        authorUserId = m.AuthorUserId,
        authorHandle = m.Author?.Handle ?? "",
        authorDisplayName = DisplayName(m.Author),
        authorAvatarUrl = UserPublicFields.RosterAvatarUrl(m.Author),
        body = m.Body,
        sentAt = m.SentAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
    };
}
