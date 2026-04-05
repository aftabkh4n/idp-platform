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

// GitHub integration
builder.Services.Configure<GitHubSettings>(
builder.Configuration.GetSection("GitHub"));
builder.Services.AddScoped<IGitHubService, GitHubService>();

// Kubernetes integration
builder.Services.AddScoped<IKubernetesService, KubernetesService>();

// Background worker — runs the provisioning pipeline
builder.Services.AddHostedService<ProvisioningWorker>();

builder.Services.AddOpenApi();
builder.Services.AddControllers();
builder.Services.AddSignalR();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<IdpDbContext>();
    db.Database.Migrate();
}



app.MapOpenApi();
app.MapScalarApiReference(); // API docs live at /scalar/v1

app.MapControllers();

app.Run();