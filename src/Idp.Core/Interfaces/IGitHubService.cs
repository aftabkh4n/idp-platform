namespace Idp.Core.Interfaces;

public interface IGitHubService
{
    // Returns the new repo's URL, e.g. https://github.com/you/payments-api
    Task<string> CreateServiceRepoAsync(
        string serviceName,
        string language,
        string description,
        CancellationToken ct = default);
}