using Idp.Core.Interfaces;
using Idp.Core.Models;
using Idp.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Idp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ServicesController(
    IdpDbContext db,
    IGitHubService gitHub,
    ILogger<ServicesController> logger) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ServiceRequest request)
    {
        logger.LogInformation("New service request: {Name} ({Language}) by {Owner}",
            request.Name, request.Language, request.Owner);

        var service = new ProvisionedService
        {
            Name        = request.Name,
            Language    = request.Language,
            Owner       = request.Owner,
            Description = request.Description,
            Status      = ProvisioningStatus.Queued
        };

        db.Services.Add(service);
        await db.SaveChangesAsync();

        // Kick off GitHub provisioning (we'll move this to background worker in Week 3)
        try
        {
            service.Status = ProvisioningStatus.CreatingRepo;
            await db.SaveChangesAsync();

            var repoUrl = await gitHub.CreateServiceRepoAsync(
                request.Name,
                request.Language,
                request.Description ?? $"Service provisioned by IDP Platform");

            service.RepoUrl = repoUrl;
            service.Status  = ProvisioningStatus.Deployed;
            await db.SaveChangesAsync();

            logger.LogInformation("Service {Name} provisioned at {Url}",
                request.Name, repoUrl);
        }
        catch (Exception ex)
        {
            service.Status       = ProvisioningStatus.Failed;
            service.ErrorMessage = ex.Message;
            await db.SaveChangesAsync();

            logger.LogError(ex, "Failed to provision service {Name}", request.Name);
        }

        return Accepted(new
        {
            service.Id,
            service.Status,
            service.RepoUrl,
            StatusUrl = $"/api/services/{service.Id}"
        });
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var services = await db.Services
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();
        return Ok(services);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var service = await db.Services.FindAsync(id);
        return service is null ? NotFound() : Ok(service);
    }
}