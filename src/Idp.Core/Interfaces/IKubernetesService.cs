namespace Idp.Core.Interfaces;

public interface IKubernetesService
{
    // Creates Namespace + Deployment + Service + Ingress for a new service
    // Returns the public URL the service will be reachable at
    Task<string> DeployServiceAsync(
        string serviceName,
        string imageTag,
        CancellationToken ct = default);
}