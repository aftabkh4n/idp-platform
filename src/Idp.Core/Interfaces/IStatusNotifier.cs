namespace Idp.Core.Interfaces;

public interface IStatusNotifier
{
    Task NotifyStatusChangedAsync(
        Guid   serviceId,
        string serviceName,
        string status,
        string? repoUrl     = null,
        string? serviceUrl  = null,
        string? errorMessage = null);
}