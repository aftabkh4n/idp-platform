using Idp.Core.Interfaces;
using Idp.Core.Models;
using Idp.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Idp.Worker;

public class ProvisioningWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<ProvisioningWorker> logger) : BackgroundService
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(5);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Provisioning worker started");

        while (!stoppingToken.IsCancellationRequested)
        {
            await ProcessQueuedJobsAsync(stoppingToken);
            await Task.Delay(PollInterval, stoppingToken);
        }
    }

    private async Task ProcessQueuedJobsAsync(CancellationToken ct)
    {
        using var scope  = scopeFactory.CreateScope();
        var db           = scope.ServiceProvider.GetRequiredService<IdpDbContext>();
        var gitHub       = scope.ServiceProvider.GetRequiredService<IGitHubService>();
        var kubernetes   = scope.ServiceProvider.GetRequiredService<IKubernetesService>();
        var notifier     = scope.ServiceProvider.GetRequiredService<IStatusNotifier>();

        var queued = await db.Services
            .Where(s => s.Status == ProvisioningStatus.Queued
                     && s.Name != null
                     && s.Name != "")
            .ToListAsync(ct);

        foreach (var service in queued)
        {
            await ProvisionServiceAsync(service, db, gitHub, kubernetes, notifier, ct);
        }
    }

    private async Task ProvisionServiceAsync(
        ProvisionedService service,
        IdpDbContext db,
        IGitHubService gitHub,
        IKubernetesService kubernetes,
        IStatusNotifier notifier,
        CancellationToken ct)
    {
        logger.LogInformation("Starting provisioning for {Name}", service.Name);

        try
        {
            // Step 1 — GitHub
            service.Status    = ProvisioningStatus.CreatingRepo;
            service.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
            await notifier.NotifyStatusChangedAsync(
                service.Id, service.Name, service.Status);

            var repoUrl = await gitHub.CreateServiceRepoAsync(
                service.Name, service.Language,
                service.Description ?? $"{service.Name} service", ct);

            service.RepoUrl   = repoUrl;
            service.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
            await notifier.NotifyStatusChangedAsync(
                service.Id, service.Name, service.Status, repoUrl: repoUrl);

            // Step 2 — Kubernetes
            service.Status    = ProvisioningStatus.DeployingK8s;
            service.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
            await notifier.NotifyStatusChangedAsync(
                service.Id, service.Name, service.Status, repoUrl: repoUrl);

            var serviceUrl = await kubernetes.DeployServiceAsync(
                service.Name, repoUrl, ct);

            service.ServiceUrl = serviceUrl;
            service.Status     = ProvisioningStatus.Deployed;
            service.UpdatedAt  = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
            await notifier.NotifyStatusChangedAsync(
                service.Id, service.Name, service.Status,
                repoUrl: repoUrl, serviceUrl: serviceUrl);

            logger.LogInformation("Provisioning complete for {Name}", service.Name);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Provisioning failed for {Name}", service.Name);

            service.Status       = ProvisioningStatus.Failed;
            service.ErrorMessage = ex.Message;
            service.UpdatedAt    = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
            await notifier.NotifyStatusChangedAsync(
                service.Id, service.Name, service.Status,
                errorMessage: ex.Message);
        }
    }
}