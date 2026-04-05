namespace Idp.Core.Models;

public class ProvisionedService
{
    public Guid   Id          { get; set; } = Guid.NewGuid();
    public string Name        { get; set; } = "";
    public string Language    { get; set; } = "";
    public string Owner       { get; set; } = "";
    public string? Description { get; set; }

    // Filled in as provisioning progresses
    public string Status      { get; set; } = ProvisioningStatus.Queued;
    public string? RepoUrl    { get; set; }
    public string? ServiceUrl { get; set; }
    public string? ErrorMessage { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}