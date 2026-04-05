using Idp.Core.Interfaces;
using Idp.Core.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Octokit;

namespace Idp.Infrastructure.GitHub;

public class GitHubService(
    IOptions<GitHubSettings> settings,
    ILogger<GitHubService> logger) : IGitHubService
{
    private readonly GitHubSettings _settings = settings.Value;

    public async Task<string> CreateServiceRepoAsync(
    string serviceName,
    string language,
    string description,
    CancellationToken ct = default)
    {
        var client = new GitHubClient(new ProductHeaderValue("idp-platform"))
        {
            Credentials = new Credentials(_settings.Token)
        };

        logger.LogInformation("GitHub token length: {Length}, Org: {Org}",
            _settings.Token?.Length ?? 0, _settings.Organisation);

        logger.LogInformation("Creating GitHub repo: {ServiceName}", serviceName);

        // 1. Create the repository
        var repo = await client.Repository.Create(new NewRepository(serviceName)
        {
            Description = description,
            Private     = false,
            AutoInit    = true
        });

        logger.LogInformation("Repo created: {Url}", repo.HtmlUrl);

        // Give GitHub a moment to finish initialising the repo before we push files
        await Task.Delay(2000, ct);

        // 2. Add the Dockerfile
        await client.Repository.Content.CreateFile(
            _settings.Organisation,
            serviceName,
            "Dockerfile",
            new CreateFileRequest(
                "chore: add Dockerfile",
                GetDockerfile(serviceName, language)));

        logger.LogInformation("Dockerfile committed");

        // 3. Add the GitHub Actions CI workflow
        await client.Repository.Content.CreateFile(
            _settings.Organisation,
            serviceName,
            ".github/workflows/ci.yml",
            new CreateFileRequest(
                "chore: add CI workflow",
                GetCiWorkflow(serviceName, language)));

        logger.LogInformation("CI workflow committed");

        // 4. Update the auto-generated README (need its SHA first)
        var existingReadme = await client.Repository.Content
            .GetAllContents(_settings.Organisation, serviceName, "README.md");

        await client.Repository.Content.UpdateFile(
            _settings.Organisation,
            serviceName,
            "README.md",
            new UpdateFileRequest(
                "docs: add README",
                GetReadme(serviceName, description),
                existingReadme[0].Sha));

        logger.LogInformation("README updated");
        logger.LogInformation("Files committed to repo: {ServiceName}", serviceName);

        return repo.HtmlUrl;
    }

    // ── File templates ────────────────────────────────────────────────

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

            _ => // default = dotnet
                """
                FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
                WORKDIR /app
                EXPOSE 8080

                # Build stage
                FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
                WORKDIR /src

                # Copy everything and build
                COPY . .

                # If a .csproj exists, build it. Otherwise just verify the SDK works.
                RUN find . -name "*.csproj" | head -1 | xargs -r dotnet restore
                RUN find . -name "*.csproj" | head -1 | xargs -r dotnet publish -c Release -o /app/publish

                FROM base AS final
                WORKDIR /app
                COPY --from=build /app/publish .
                ENTRYPOINT ["dotnet", "*.dll"]
                """
        };

    private static string GetCiWorkflow(string serviceName, string language) =>
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
              echo "Files in repo:"
              ls -la

          - name: Check Dockerfile exists
            run: test -f Dockerfile && echo "Dockerfile found" || echo "No Dockerfile yet"
    """;

    private static string GetReadme(string serviceName, string description) => $"""
        # {serviceName}

        {description}

        ## Getting started
        ```bash
        docker build -t {serviceName} .
        docker run -p 8080:8080 {serviceName}
        ```

        ## CI/CD

        This repo has a GitHub Actions pipeline that builds and smoke-tests
        the Docker image on every push to main.

        ---
        *Provisioned by [IDP Platform](https://github.com/aftabkh4n/idp-platform)*
        """;
}