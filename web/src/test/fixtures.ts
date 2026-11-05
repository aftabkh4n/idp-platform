import type { ProvisionedService, StatusChangedEvent } from "@/lib/types";

export function makeService(overrides: Partial<ProvisionedService> = {}): ProvisionedService {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    name: "payments-api",
    language: "dotnet",
    owner: "octocat",
    description: null,
    status: "queued",
    repoUrl: null,
    serviceUrl: null,
    errorMessage: null,
    failedStep: null,
    createdAt: "2026-11-05T10:00:00Z",
    updatedAt: null,
    ...overrides,
  };
}

export function makeEvent(overrides: Partial<StatusChangedEvent> = {}): StatusChangedEvent {
  return {
    serviceId: "11111111-1111-1111-1111-111111111111",
    serviceName: "payments-api",
    status: "creating_repo",
    repoUrl: null,
    serviceUrl: null,
    errorMessage: null,
    failedStep: null,
    updatedAt: "2026-11-05T10:00:05Z",
    ...overrides,
  };
}
