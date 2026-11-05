namespace Idp.Core.Models;

// These are just string constants — keeps status values consistent everywhere.
// The in-progress values are listed in pipeline order; the frontend relies on it.
public static class ProvisioningStatus
{
    public const string Queued           = "queued";
    public const string CreatingRepo     = "creating_repo";
    public const string AddingDockerfile = "adding_dockerfile";
    public const string AddingCi         = "adding_ci";
    public const string GeneratingReadme = "generating_readme";
    public const string DeployingK8s     = "deploying_k8s";
    public const string Deployed         = "deployed";
    public const string Failed           = "failed";
}
