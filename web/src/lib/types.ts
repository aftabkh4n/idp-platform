// Mirrors src/Idp.Core/Models. ASP.NET serialises properties as camelCase.

export const LANGUAGES = [
  { value: "dotnet", label: ".NET" },
  { value: "node", label: "Node.js" },
  { value: "python", label: "Python" },
] as const;

export type Language = (typeof LANGUAGES)[number]["value"];

export type ProvisioningStatus =
  | "queued"
  | "creating_repo"
  | "adding_dockerfile"
  | "adding_ci"
  | "generating_readme"
  | "deploying_k8s"
  | "deployed"
  | "failed";

export interface ProvisionedService {
  id: string;
  name: string;
  language: string;
  owner: string;
  description: string | null;
  // Typed as string too: an older or newer API may send a value we don't know.
  status: ProvisioningStatus | (string & {});
  repoUrl: string | null;
  serviceUrl: string | null;
  errorMessage: string | null;
  failedStep: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface ServiceRequest {
  name: string;
  language: Language;
  owner: string;
  description: string | null;
}

export interface CreateServiceResponse {
  id: string;
  status: string;
  statusUrl: string;
  message: string;
}

/** Payload of the hub's "StatusChanged" message (SignalRStatusNotifier.cs). */
export interface StatusChangedEvent {
  serviceId: string;
  serviceName: string;
  status: string;
  repoUrl: string | null;
  serviceUrl: string | null;
  errorMessage: string | null;
  failedStep: string | null;
  updatedAt: string;
}
