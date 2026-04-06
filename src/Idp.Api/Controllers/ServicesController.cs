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
    ILogger<ServicesController> logger) : ControllerBase
{
    [HttpPost]
public async Task<IActionResult> Create([FromBody] ServiceRequest request)
{
    logger.LogInformation("Queuing service: {Name} ({Language}) by {Owner}",
        request.Name, request.Language, request.Owner);

    var service = new ProvisionedService
    {
        Name        = request.Name,
        Language    = request.Language,
        Owner       = request.Owner,
        Description = request.Description,
        Status      = ProvisioningStatus.Queued   // worker picks this up
    };

    db.Services.Add(service);
    await db.SaveChangesAsync();

    // Returns in <100ms — worker does the heavy lifting in background
    return Accepted(new
    {
        service.Id,
        service.Status,
        StatusUrl  = $"/api/services/{service.Id}",
        Message    = "Provisioning started. Poll the StatusUrl to track progress."
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