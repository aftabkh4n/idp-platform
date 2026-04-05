namespace Idp.Core.Models;

public record ServiceRequest(
    string Name,        // e.g. "payments-api"
    string Language,    // "dotnet" | "node" | "python"
    string Owner,       // GitHub username
    string? Description
);