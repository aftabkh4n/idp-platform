namespace IdpPlatform.GitHub;

/// <summary>
/// Configuration options for the GitHub provisioner.
/// </summary>
public class GitHubProvisionerOptions
{
    /// <summary>
    /// Your GitHub Personal Access Token.
    /// Needs repo, workflow, and delete_repo scopes.
    /// </summary>
    public string Token { get; set; } = "";

    /// <summary>
    /// Your GitHub username or organisation name.
    /// Repos will be created under this account.
    /// </summary>
    public string Organisation { get; set; } = "";

    /// <summary>
    /// Whether to create repos as private. Default is false (public).
    /// </summary>
    public bool PrivateRepos { get; set; } = false;
}