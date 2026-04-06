using Idp.Api.Hubs;
using Idp.Core.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace Idp.Api.Services;

public class SignalRStatusNotifier(IHubContext<ProvisioningHub> hubContext) : IStatusNotifier
{
    public async Task NotifyStatusChangedAsync(
        Guid   serviceId,
        string serviceName,
        string status,
        string? repoUrl      = null,
        string? serviceUrl   = null,
        string? errorMessage = null)
    {
        // Push to ALL connected browser clients
        await hubContext.Clients.All.SendAsync("StatusChanged", new
        {
            ServiceId    = serviceId,
            ServiceName  = serviceName,
            Status       = status,
            RepoUrl      = repoUrl,
            ServiceUrl   = serviceUrl,
            ErrorMessage = errorMessage,
            UpdatedAt    = DateTime.UtcNow
        });
    }
}