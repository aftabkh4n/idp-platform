namespace Idp.Core.Interfaces;

public interface IGitHubService
{
    // Returns the new repo's URL, e.g. https://github.com/you/payments-api.
    // onStepStarted is called with a ProvisioningStatus value before each step
    // (repo, Dockerfile, CI, README) so callers can report progress.
    Task<string> CreateServiceRepoAsync(
        string serviceName,
        string language,
        string owner,
        string description,
        Func<string, Task>? onStepStarted = null,
        CancellationToken ct = default);
}
