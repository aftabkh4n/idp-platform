namespace Idp.Core.Models;

// These are just string constants — keeps status values consistent everywhere
public static class ProvisioningStatus
{
    public const string Queued       = "queued";
    public const string CreatingRepo = "creating_repo";
    public const string DeployingK8s = "deploying_k8s";
    public const string Deployed     = "deployed";
    public const string Failed       = "failed";
}