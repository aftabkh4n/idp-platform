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

        // Persist the new status and push it to connected browsers
        async Task SetStatusAsync(string status)
        {
            service.Status    = status;
            service.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
            await notifier.NotifyStatusChangedAsync(
                service.Id, service.Name, service.Status,
                repoUrl: service.RepoUrl, serviceUrl: service.ServiceUrl);
        }

        try
        {
            // Steps 1-4 — GitHub repo, Dockerfile, CI workflow, README
            service.RepoUrl = await gitHub.CreateServiceRepoAsync(
                service.Name, service.Language, service.Owner,
                service.Description ?? $"{service.Name} service",
                onStepStarted: SetStatusAsync,
                ct: ct);

            // Step 5 — Kubernetes
            await SetStatusAsync(ProvisioningStatus.DeployingK8s);

            service.ServiceUrl = await kubernetes.DeployServiceAsync(
                service.Name, service.RepoUrl, ct);

            await SetStatusAsync(ProvisioningStatus.Deployed);

            logger.LogInformation("Provisioning complete for {Name}", service.Name);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Provisioning failed for {Name} during {Step}",
                service.Name, service.Status);

            service.FailedStep   = service.Status;
            service.Status       = ProvisioningStatus.Failed;
            service.ErrorMessage = ex.Message;
            service.UpdatedAt    = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
            await notifier.NotifyStatusChangedAsync(
                service.Id, service.Name, service.Status,
                repoUrl: service.RepoUrl,
                errorMessage: ex.Message,
                failedStep: service.FailedStep);
        }
    }
}