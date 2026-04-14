# ── Stage 1: Build ───────────────────────────────────────────────
# Use the full .NET SDK to compile the application
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build

WORKDIR /src

# Copy project files first so Docker can cache the restore step
# This means NuGet packages are only re-downloaded when .csproj changes
COPY ["src/Idp.Api/Idp.Api.csproj", "src/Idp.Api/"]
COPY ["src/Idp.Core/Idp.Core.csproj", "src/Idp.Core/"]
COPY ["src/Idp.Infrastructure/Idp.Infrastructure.csproj", "src/Idp.Infrastructure/"]
COPY ["src/Idp.Worker/Idp.Worker.csproj", "src/Idp.Worker/"]

# Restore all NuGet packages
RUN dotnet restore "src/Idp.Api/Idp.Api.csproj"

# Copy the rest of the source code
COPY . .

# Build and publish in Release mode
RUN dotnet publish "src/Idp.Api/Idp.Api.csproj" \
    --configuration Release \
    --output /app/publish \
    --no-restore

# ── Stage 2: Runtime ─────────────────────────────────────────────
# Use the smaller runtime image (no SDK) to run the app
# This keeps the final image small and secure
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final

WORKDIR /app

# Create a non-root user for security
# Running as root inside containers is a security risk
RUN adduser --disabled-password --gecos "" appuser && chown -R appuser /app
USER appuser

# Copy only the published output from the build stage
COPY --from=build /app/publish .

# The app listens on port 8080 inside the container
EXPOSE 8080

# Set environment to Production
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:8080

# Start the application
ENTRYPOINT ["dotnet", "Idp.Api.dll"]