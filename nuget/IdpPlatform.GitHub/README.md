# IdpPlatform.GitHub

Automatically provision GitHub repositories with Dockerfiles and CI 
pipelines from your .NET application.

## Install
```bash
dotnet add package IdpPlatform.GitHub
```

## Quick start
```csharp
using IdpPlatform.GitHub;

var provisioner = new GitHubProvisioner(new GitHubProvisionerOptions
{
    Token        = "your-github-token",
    Organisation = "your-github-username"
});

var result = await provisioner.CreateServiceRepoAsync(
    serviceName: "payments-api",
    language:    "dotnet",
    description: "Handles payment processing");

Console.WriteLine(result.RepoUrl);
// https://github.com/your-username/payments-api
```

## Supported languages

| Value | Dockerfile template |
|---|---|
| `dotnet` | ASP.NET Core 9 multi-stage build |
| `node` | Node.js 20 Alpine |
| `python` | Python 3.12 slim |

## What gets created

Every provisioned repo includes:
- `Dockerfile` — ready to build and run
- `.github/workflows/ci.yml` — GitHub Actions pipeline
- `README.md` — service documentation template

## Options

| Property | Description | Default |
|---|---|---|
| `Token` | GitHub Personal Access Token | Required |
| `Organisation` | GitHub username or org name | Required |
| `PrivateRepos` | Create private repos | `false` |

## Source

Part of the [IDP Platform](https://github.com/aftabkh4n/idp-platform) 
open source project.