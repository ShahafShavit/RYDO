using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Rydo.Api.Hubs;

[Authorize]
public class ClubChatHub : Hub
{
    public Task JoinClub(int clubId) =>
        Groups.AddToGroupAsync(Context.ConnectionId, ClubGroupName(clubId));

    public Task LeaveClub(int clubId) =>
        Groups.RemoveFromGroupAsync(Context.ConnectionId, ClubGroupName(clubId));

    public static string ClubGroupName(int clubId) => $"club_{clubId}";
}
