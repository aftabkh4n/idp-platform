namespace Idp.Core.Models;

// This maps directly to the "GitHub" section in appsettings.json
public class GitHubSettings
{
    public string Token        { get; set; } = "";
    public string Organisation { get; set; } = "";
}