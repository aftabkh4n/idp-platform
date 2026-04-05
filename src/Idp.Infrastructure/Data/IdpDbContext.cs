using Idp.Core.Models;
using Microsoft.EntityFrameworkCore;

namespace Idp.Infrastructure.Data;

public class IdpDbContext(DbContextOptions<IdpDbContext> options) : DbContext(options)
{
    public DbSet<ProvisionedService> Services => Set<ProvisionedService>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ProvisionedService>(e =>
        {
            e.HasKey(s => s.Id);
            e.Property(s => s.Name).HasMaxLength(100).IsRequired();
            e.Property(s => s.Status).HasMaxLength(50).IsRequired();
        });
    }
}