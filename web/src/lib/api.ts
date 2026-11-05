import { API_URL } from "./config";
import type { CreateServiceResponse, ProvisionedService, ServiceRequest } from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    /** HTTP status, or 0 when the request never reached the server. */
    readonly status: number,
    /** Per-field messages from an ASP.NET validation problem response, keyed camelCase. */
    readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ProblemDetails {
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
}

function camelCase(key: string) {
  // "Name" or "$.name" -> "name"
  const last = key.split(".").pop() ?? key;
  return last.charAt(0).toLowerCase() + last.slice(1);
}

async function toApiError(res: Response): Promise<ApiError> {
  let problem: ProblemDetails = {};
  try {
    problem = (await res.json()) as ProblemDetails;
  } catch {
    // Not JSON; fall back to the status text.
  }

  const fieldErrors: Record<string, string> = {};
  for (const [key, messages] of Object.entries(problem.errors ?? {})) {
    if (messages[0]) fieldErrors[camelCase(key)] = messages[0];
  }

  const message =
    problem.detail ?? problem.title ?? `Request failed: ${res.status} ${res.statusText}`.trim();
  return new ApiError(message, res.status, fieldErrors);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { Accept: "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError(`Can't reach the IDP API at ${API_URL}. Is it running?`, 0);
  }
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as T;
}

export function fetchServices(signal?: AbortSignal) {
  return request<ProvisionedService[]>("/api/services", { signal });
}

export function fetchService(id: string, signal?: AbortSignal) {
  return request<ProvisionedService>(`/api/services/${encodeURIComponent(id)}`, { signal });
}

export function createService(body: ServiceRequest) {
  return request<CreateServiceResponse>("/api/services", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
