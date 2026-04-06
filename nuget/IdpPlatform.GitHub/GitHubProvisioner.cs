using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Octokit;

namespace IdpPlatform.GitHub;

/// <summary>
/// Provisions GitHub repositories with Dockerfiles and CI pipelines
/// automatically from your .NET application.
/// </summary>
public class GitHubProvisioner
{
    private readonly GitHubProvisionerOptions _options;
    private readonly ILogger<GitHubProvisioner> _logger;

    /// <param name="options">Configuration including token and organisation.</param>
    /// <param name="logger">Optional logger. Defaults to no-op logger.</param>
    public GitHubProvisioner(
        GitHubProvisionerOptions options,
        ILogger<GitHubProvisioner>? logger = null)
    {
        _options = options ?? throw new ArgumentNullException(nameof(options));
        _logger  = logger ?? NullLogger<GitHubProvisioner>.Instance;

        if (string.IsNullOrWhiteSpace(options.Token))
            throw new ArgumentException("GitHub token cannot be empty.", nameof(options));

        if (string.IsNullOrWhiteSpace(options.Organisation))
            throw new ArgumentException("Organisation cannot be empty.", nameof(options));
    }

    /// <summary>
    /// Creates a new GitHub repository with a Dockerfile and CI pipeline.
    /// </summary>
    /// <param name="serviceName">
    ///     Name of the service. Used as the repo name. 
    ///     Use lowercase with hyphens e.g. "payments-api".
    /// </param>
    /// <param name="language">
    ///     Target language. Supported values: "dotnet", "node", "python".
    ///     Determines the Dockerfile template used.
    /// </param>
    /// <param name="description">Short description of the service.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>Details of the provisioned repository.</returns>
    public async Task<ProvisionedRepo> CreateServiceRepoAsync(
        string serviceName,
        string language     = "dotnet",
        string description  = "",
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(serviceName))
            throw new ArgumentException("Service name cannot be empty.", nameof(serviceName));

        var client = new GitHubClient(new ProductHeaderValue("idp-platform-nuget"))
        {
            Credentials = new Credentials(_options.Token)
        };

        _logger.LogInformation("Creating GitHub repo: {ServiceName}", serviceName);

        // 1. Create repo
        var repo = await client.Repository.Create(new NewRepository(serviceName)
        {
            Description = description,
            Private     = _options.PrivateRepos,
            AutoInit    = true
        });

        _logger.LogInformation("Repo created: {Url}", repo.HtmlUrl);

        // Wait for GitHub to finish initialising
        await Task.Delay(2000, ct);

        // 2. Commit Dockerfile
        await client.Repository.Content.CreateFile(
            _options.Organisation, serviceName, "Dockerfile",
            new CreateFileRequest(
                "chore: add Dockerfile",
                GetDockerfile(serviceName, language)));

        // 3. Commit CI workflow
        await client.Repository.Content.CreateFile(
            _options.Organisation, serviceName, ".github/workflows/ci.yml",
            new CreateFileRequest(
                "chore: add CI workflow",
                GetCiWorkflow()));

        // 4. Update README
        var existing = await client.Repository.Content
            .GetAllContents(_options.Organisation, serviceName, "README.md");

        await client.Repository.Content.UpdateFile(
            _options.Organisation, serviceName, "README.md",
            new UpdateFileRequest(
                "docs: add README",
                GetReadme(serviceName, description),
                existing[0].Sha));

        _logger.LogInformation("Provisioning complete: {Url}", repo.HtmlUrl);

        return new ProvisionedRepo
        {
            RepoUrl      = repo.HtmlUrl,
            Name         = serviceName,
            Organisation = _options.Organisation,
            ProvisionedAt = DateTime.UtcNow
        };
    }

    // ── Templates ────────────────────────────────────────────────────

    private static string GetDockerfile(string serviceName, string language) =>
        language.ToLower() switch
        {
            "node" => """
                FROM node:20-alpine
                WORKDIR /app
                COPY package*.json ./
                RUN npm ci --only=production
                COPY . .
                EXPOSE 3000
                CMD ["node", "index.js"]
                """,

            "python" => """
                FROM python:3.12-slim
                WORKDIR /app
                COPY requirements.txt .
                RUN pip install --no-cache-dir -r requirements.txt
                COPY . .
                EXPOSE 8000
                CMD ["python", "main.py"]
                """,

            _ =>
                $"""
                FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
                WORKDIR /app
                EXPOSE 8080

                FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
                WORKDIR /src
                COPY . .
                RUN find . -name "*.csproj" | head -1 | xargs -r dotnet restore
                RUN find . -name "*.csproj" | head -1 | xargs -r dotnet publish -c Release -o /app/publish

                FROM base AS final
                WORKDIR /app
                COPY --from=build /app/publish .
                ENTRYPOINT ["dotnet", "{serviceName}.dll"]
                """
        };

    private static string GetCiWorkflow() =>
        """
        name: CI

        on:
        push:
            branches: [ main ]
        pull_request:
            branches: [ main ]

        jobs:
        build:
            runs-on: ubuntu-latest
            steps:
            - uses: actions/checkout@v4

            - name: Verify repo structure
                run: |
                echo "Repository: ${{ github.repository }}"
                ls -la

            - name: Check Dockerfile exists
                run: test -f Dockerfile && echo "Dockerfile found"
        """;

    private static string GetReadme(string serviceName, string description) =>
        $"""
        # {serviceName}

        {description}

        ## Getting started
        ```bash
                docker build -t {serviceName} .
                docker run -p 8080:8080 {serviceName}
        ```

        ---
        *Provisioned by [IDP Platform](https://github.com/aftabkh4n/idp-platform)*
        """;
}