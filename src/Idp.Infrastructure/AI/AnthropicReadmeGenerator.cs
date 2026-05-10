using Anthropic.SDK;
using Anthropic.SDK.Messaging;
using Idp.Core.Interfaces;
using Idp.Core.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Idp.Infrastructure.AI;

public class AnthropicReadmeGenerator(
    IOptions<AnthropicSettings> settings,
    ILogger<AnthropicReadmeGenerator> logger) : IReadmeGenerator
{
    private readonly AnthropicSettings _settings = settings.Value;

    public async Task<string> GenerateReadmeAsync(
        string serviceName,
        string language,
        string owner,
        string description,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_settings.ApiKey))
        {
            logger.LogWarning("Anthropic API key not configured, using fallback README for {ServiceName}", serviceName);
            return GetFallbackReadme(serviceName, language, owner, description);
        }

        var client = new AnthropicClient(_settings.ApiKey);

        var prompt = $"""
            Generate a professional README.md for a new microservice with these details:
            - Service Name: {serviceName}
            - Programming Language/Framework: {language}
            - Owner/Team: {owner}
            - Description: {description}

            The README must include these sections in order:
            1. Project name as an H1 heading
            2. A brief description that reflects the language, team context, and what the service does
            3. ## Getting Started with prerequisites and how to clone and run the service
            4. ## .NET Setup with instructions for running with the .NET SDK and Docker on .NET infrastructure
            5. ## Configuration explaining environment variables or appsettings
            6. ## CI/CD mentioning the included GitHub Actions pipeline

            Return only the raw Markdown, no preamble or explanation.
            """;

        var request = new MessageParameters
        {
            Model = "claude-haiku-4-5-20251001",
            MaxTokens = 1024,
            Messages = new List<Message>
            {
                new Message(RoleType.User, prompt)
            }
        };

        try
        {
            logger.LogInformation("Generating AI README for {ServiceName}", serviceName);
            var response = await client.Messages.GetClaudeMessageAsync(request, ct);
            var readme = response.Message.ToString().Trim();
            logger.LogInformation("AI README generated successfully for {ServiceName}", serviceName);
            return readme;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "AI README generation failed for {ServiceName}, falling back to template", serviceName);
            return GetFallbackReadme(serviceName, language, owner, description);
        }
    }

    private static string GetFallbackReadme(
        string serviceName,
        string language,
        string owner,
        string description) => $"""
        # {serviceName}

        {description}

        **Owner:** {owner}
        **Language:** {language}

        ## Getting Started

        ### Prerequisites
        - Docker
        - .NET 9 SDK (for local development)

        ### Run with Docker
        ```bash
        docker build -t {serviceName} .
        docker run -p 8080:8080 {serviceName}
        ```

        ## .NET Setup

        ```bash
        dotnet restore
        dotnet run
        ```

        ## Configuration

        Configure the service via environment variables or `appsettings.json`.

        ## CI/CD

        This repo includes a GitHub Actions pipeline that builds and smoke-tests
        the service on every push to `main`.

        ---
        *Provisioned by [IDP Platform](https://github.com/aftabkh4n/idp-platform)*
        """;
}
