using Idp.Api.Hubs;
using Idp.Api.Services;
using Idp.Core.Interfaces;
using Idp.Core.Models;
using Idp.Infrastructure.Data;
using Idp.Infrastructure.GitHub;
using Idp.Infrastructure.Kubernetes;
using Idp.Worker;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((ctx, cfg) =>
    cfg.ReadFrom.Configuration(ctx.Configuration)
       .WriteTo.Console());

builder.Services.AddDbContext<IdpDbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("Postgres")));

builder.Services.AddOpenApi();
builder.Services.AddControllers();
builder.Services.AddSignalR();

// GitHub + Kubernetes + SignalR notifier
builder.Services.Configure<GitHubSettings>(
    builder.Configuration.GetSection("GitHub"));
builder.Services.AddScoped<IGitHubService,    GitHubService>();
builder.Services.AddScoped<IKubernetesService, KubernetesService>();
builder.Services.AddScoped<IStatusNotifier,   SignalRStatusNotifier>();

// Background worker
builder.Services.AddHostedService<ProvisioningWorker>();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<IdpDbContext>();
    db.Database.Migrate();
}
// Enable OpenAPI/Swagger at 

app.MapOpenApi();
app.MapScalarApiReference();

// Serve the dashboard at http://localhost:0000/
app.UseDefaultFiles();
app.UseStaticFiles();

// SignalR hub endpoint
app.MapHub<ProvisioningHub>("/hubs/provisioning");

app.MapControllers();

app.Run();// trigger ai review
