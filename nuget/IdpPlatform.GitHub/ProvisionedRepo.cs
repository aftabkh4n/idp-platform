namespace IdpPlatform.GitHub;

/// <summary>
/// Result of a successful repo provisioning.
/// </summary>
public class ProvisionedRepo
{
    /// <summary>The full URL of the created repository.</summary>
    public string RepoUrl { get; init; } = "";

    /// <summary>The repository name.</summary>
    public string Name { get; init; } = "";

    /// <summary>The organisation or user it was created under.</summary>
    public string Organisation { get; init; } = "";

    /// <summary>UTC timestamp of when provisioning completed.</summary>
    public DateTime ProvisionedAt { get; init; } = DateTime.UtcNow;
}