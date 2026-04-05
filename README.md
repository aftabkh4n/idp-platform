# IDP Platform — Internal Developer Platform

> A self-service platform that lets developers provision fully configured 
> microservices with a single API call — GitHub repo, Dockerfile, 
> Kubernetes deployment, all created automatically.

## What it does

POST one request to `/api/services` and the platform automatically:

1. Creates a GitHub repository with the correct structure
2. Adds a Dockerfile and GitHub Actions CI pipeline
3. Deploys the service to Kubernetes (Deployment + Service + Ingress)
4. Streams real-time provisioning status back via SignalR

## Tech stack

| Layer | Technology |
|---|---|
| API | ASP.NET Core 9 |
| Database | PostgreSQL + Entity Framework Core |
| GitHub automation | Octokit.net (GitHub REST API) |
| Kubernetes automation | KubernetesClient |
| Real-time updates | SignalR |
| Logging | Serilog (structured JSON logs) |
| API docs | Scalar |

## Running locally

**Prerequisites:** .NET 9, Docker Desktop
```bash
# 1. Start the database
docker run -d \
  --name idp-postgres \
  -e POSTGRES_USER=idpuser \
  -e POSTGRES_PASSWORD=idppass \
  -e POSTGRES_DB=idpdb \
  -p 5432:5432 \
  postgres:16

# 2. Run the API
dotnet run --project src/Idp.Api

# 3. Open API docs
# http://localhost:5107/scalar/v1
```

## API endpoints

| Method | Endpoint | What it does |
|---|---|---|
| POST | `/api/services` | Provision a new service |
| GET | `/api/services` | List all services |
| GET | `/api/services/{id}` | Check provisioning status |

## Project structure