using Idp.Core.Interfaces;
using k8s;
using k8s.Models;
using Microsoft.Extensions.Logging;

namespace Idp.Infrastructure.Kubernetes;

public class KubernetesService(ILogger<KubernetesService> logger) : IKubernetesService
{
    public async Task<string> DeployServiceAsync(
        string serviceName,
        string imageTag,
        CancellationToken ct = default)
    {
        // Loads config from ~/.kube/config locally, or in-cluster config when
        // running inside Kubernetes itself
        var config = KubernetesClientConfiguration.IsInCluster()
            ? KubernetesClientConfiguration.InClusterConfig()
            : KubernetesClientConfiguration.BuildConfigFromConfigFile();

        var client = new k8s.Kubernetes(config);

        var ns        = serviceName.ToLower();
        var imageRepo = $"ghcr.io/your-org/{serviceName}:latest";

        logger.LogInformation("Deploying {Service} to Kubernetes", serviceName);

        // 1. Create Namespace
        await EnsureNamespaceAsync(client, ns, ct);

        // 2. Create Deployment
        await CreateDeploymentAsync(client, ns, serviceName, imageRepo, ct);

        // 3. Create Service (ClusterIP — internal load balancer)
        await CreateK8sServiceAsync(client, ns, serviceName, ct);

        // 4. Create Ingress (exposes the service externally)
        await CreateIngressAsync(client, ns, serviceName, ct);

        var serviceUrl = $"http://{serviceName}.your-cluster-domain.com";

        logger.LogInformation("Service {Name} deployed at {Url}", serviceName, serviceUrl);

        return serviceUrl;
    }

    // ── Kubernetes object builders ────────────────────────────────────

    private static async Task EnsureNamespaceAsync(
        k8s.Kubernetes client, string ns, CancellationToken ct)
    {
        var namespaces = await client.CoreV1.ListNamespaceAsync(cancellationToken: ct);
        var exists = namespaces.Items.Any(n => n.Metadata.Name == ns);

        if (!exists)
        {
            await client.CoreV1.CreateNamespaceAsync(new V1Namespace
            {
                Metadata = new V1ObjectMeta { Name = ns }
            }, cancellationToken: ct);
        }
    }

    private static async Task CreateDeploymentAsync(
        k8s.Kubernetes client,
        string ns,
        string serviceName,
        string image,
        CancellationToken ct)
    {
        var deployment = new V1Deployment
        {
            Metadata = new V1ObjectMeta
            {
                Name              = serviceName,
                NamespaceProperty = ns,
                Labels            = new Dictionary<string, string> { ["app"] = serviceName }
            },
            Spec = new V1DeploymentSpec
            {
                Replicas = 1,
                Selector = new V1LabelSelector
                {
                    MatchLabels = new Dictionary<string, string> { ["app"] = serviceName }
                },
                Template = new V1PodTemplateSpec
                {
                    Metadata = new V1ObjectMeta
                    {
                        Labels = new Dictionary<string, string> { ["app"] = serviceName }
                    },
                    Spec = new V1PodSpec
                    {
                        Containers = new List<V1Container>
                        {
                            new()
                            {
                                Name  = serviceName,
                                Image = image,
                                Ports = new List<V1ContainerPort>
                                {
                                    new() { ContainerPort = 8080 }
                                },
                                // Health checks so K8s knows when the pod is ready
                                ReadinessProbe = new V1Probe
                                {
                                    HttpGet = new V1HTTPGetAction
                                    {
                                        Path   = "/healthz",
                                        Port   = 8080
                                    },
                                    InitialDelaySeconds = 5,
                                    PeriodSeconds       = 10
                                }
                            }
                        }
                    }
                }
            }
        };

        await client.AppsV1.CreateNamespacedDeploymentAsync(
            deployment, ns, cancellationToken: ct);
    }

    private static async Task CreateK8sServiceAsync(
        k8s.Kubernetes client, string ns, string serviceName, CancellationToken ct)
    {
        var service = new V1Service
        {
            Metadata = new V1ObjectMeta
            {
                Name              = serviceName,
                NamespaceProperty = ns
            },
            Spec = new V1ServiceSpec
            {
                Selector = new Dictionary<string, string> { ["app"] = serviceName },
                Ports    = new List<V1ServicePort>
                {
                    new() { Port = 80, TargetPort = 8080 }
                }
            }
        };

        await client.CoreV1.CreateNamespacedServiceAsync(
            service, ns, cancellationToken: ct);
    }

    private static async Task CreateIngressAsync(
        k8s.Kubernetes client, string ns, string serviceName, CancellationToken ct)
    {
        var ingress = new V1Ingress
        {
            Metadata = new V1ObjectMeta
            {
                Name              = serviceName,
                NamespaceProperty = ns,
                Annotations       = new Dictionary<string, string>
                {
                    ["nginx.ingress.kubernetes.io/rewrite-target"] = "/"
                }
            },
            Spec = new V1IngressSpec
            {
                Rules = new List<V1IngressRule>
                {
                    new()
                    {
                        Host = $"{serviceName}.your-cluster-domain.com",
                        Http = new V1HTTPIngressRuleValue
                        {
                            Paths = new List<V1HTTPIngressPath>
                            {
                                new()
                                {
                                    Path     = "/",
                                    PathType = "Prefix",
                                    Backend  = new V1IngressBackend
                                    {
                                        Service = new V1IngressServiceBackend
                                        {
                                            Name = serviceName,
                                            Port = new V1ServiceBackendPort { Number = 80 }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        };

        await client.NetworkingV1.CreateNamespacedIngressAsync(
            ingress, ns, cancellationToken: ct);
    }
}