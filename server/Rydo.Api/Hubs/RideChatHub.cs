using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Rydo.Api.Hubs;

[Authorize]
public class RideChatHub : Hub
{
    public Task JoinRide(int rideId) =>
        Groups.AddToGroupAsync(Context.ConnectionId, RideGroupName(rideId));

    public Task LeaveRide(int rideId) =>
        Groups.RemoveFromGroupAsync(Context.ConnectionId, RideGroupName(rideId));

    public static string RideGroupName(int rideId) => $"ride_chat_{rideId}";
}
