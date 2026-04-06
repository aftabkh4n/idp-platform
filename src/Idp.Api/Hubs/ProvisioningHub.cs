using Microsoft.AspNetCore.SignalR;

namespace Idp.Api.Hubs;

// Clients connect to this hub and receive live status updates
public class ProvisioningHub : Hub
{
    // Called when a browser connects
    public override async Task OnConnectedAsync()
    {
        await Clients.Caller.SendAsync("Connected", "Connected to IDP Platform");
        await base.OnConnectedAsync();
    }
}