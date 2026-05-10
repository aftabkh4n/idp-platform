namespace Idp.Core.Interfaces;

public interface IReadmeGenerator
{
    Task<string> GenerateReadmeAsync(
        string serviceName,
        string language,
        string owner,
        string description,
        CancellationToken ct = default);
}
