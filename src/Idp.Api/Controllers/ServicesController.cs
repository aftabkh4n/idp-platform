using Idp.Core.Models;
using Idp.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Idp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ServicesController(IdpDbContext db, ILogger<ServicesController> logger) : ControllerBase
{
    // POST /api/services — create a new service (returns immediately, provisioning is async)
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

        // We return 202 Accepted — the work happens in the background
        return Accepted(new
        {
            service.Id,
            service.Status,
            StatusUrl = $"/api/services/{service.Id}"
        });
    }

    // GET /api/services — list all services
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var services = await db.Services
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();
        return Ok(services);
    }

    // GET /api/services/{id} — check provisioning status
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var service = await db.Services.FindAsync(id);
        return service is null ? NotFound() : Ok(service);
    }
}