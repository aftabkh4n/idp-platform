import type { ProvisionedService, StatusChangedEvent } from "./types";

/** Pipeline steps in the order the worker runs them (ProvisioningWorker.cs). */
export const STEPS = [
  { status: "creating_repo", label: "GitHub repository", detail: "Create the repo" },
  { status: "adding_dockerfile", label: "Dockerfile", detail: "Commit a Dockerfile for the language" },
  { status: "adding_ci", label: "CI workflow", detail: "Commit a GitHub Actions pipeline" },
  { status: "generating_readme", label: "README", detail: "Generate a README with AI" },
  { status: "deploying_k8s", label: "Kubernetes", detail: "Namespace, Deployment, Service and Ingress" },
] as const;

export type StepState = "pending" | "active" | "done" | "failed" | "skipped";

const STATUS_LABELS: Record<string, string> = {
  queued: "Queued",
  creating_repo: "Creating repository",
  adding_dockerfile: "Adding Dockerfile",
  adding_ci: "Adding CI workflow",
  generating_readme: "Generating README",
  deploying_k8s: "Deploying to Kubernetes",
  deployed: "Deployed",
  failed: "Failed",
};

export function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

export function stepLabel(status: string | null | undefined) {
  return STEPS.find((s) => s.status === status)?.label;
}

export function isTerminal(status: string | undefined) {
  return status === "deployed" || status === "failed";
}

export type StatusTone = "neutral" | "progress" | "success" | "danger";

export function statusTone(status: string): StatusTone {
  if (status === "deployed") return "success";
  if (status === "failed") return "danger";
  if (status === "queued") return "neutral";
  return STEPS.some((s) => s.status === status) ? "progress" : "neutral";
}

function stepIndex(status: string | null | undefined) {
  return STEPS.findIndex((s) => s.status === status);
}

/**
 * Where the pipeline failed. Uses failedStep when the API sends it; rows from
 * before that field existed only tell us whether the repo was created.
 */
function failedIndex(service: Pick<ProvisionedService, "failedStep" | "repoUrl">) {
  const idx = stepIndex(service.failedStep);
  if (idx !== -1) return idx;
  return service.repoUrl ? stepIndex("deploying_k8s") : -1;
}

/** The state of each entry in STEPS for a service, in the same order. */
export function getStepStates(
  service: Pick<ProvisionedService, "status" | "failedStep" | "repoUrl">,
): StepState[] {
  const { status } = service;

  if (status === "deployed") return STEPS.map(() => "done");

  if (status === "failed") {
    const failed = failedIndex(service);
    // Unknown failure point: don't claim any step passed.
    if (failed === -1) return STEPS.map(() => "skipped");
    return STEPS.map((_, i) => (i < failed ? "done" : i === failed ? "failed" : "skipped"));
  }

  const current = stepIndex(status);
  // "queued", or a status this UI doesn't know yet.
  if (current === -1) return STEPS.map(() => "pending");
  return STEPS.map((_, i) => (i < current ? "done" : i === current ? "active" : "pending"));
}

function timestamp(value: string | null | undefined) {
  const t = value ? Date.parse(value) : NaN;
  return Number.isNaN(t) ? -Infinity : t;
}

/**
 * Merge a hub event into a service. Events can arrive after a fresher REST
 * response (e.g. a refetch on reconnect), so stale events are ignored.
 */
export function applyStatusEvent(
  service: ProvisionedService,
  event: StatusChangedEvent,
): ProvisionedService {
  if (event.serviceId !== service.id) return service;

  const current = Math.max(timestamp(service.updatedAt), timestamp(service.createdAt));
  if (timestamp(event.updatedAt) < current) return service;

  return {
    ...service,
    status: event.status,
    repoUrl: event.repoUrl ?? service.repoUrl,
    serviceUrl: event.serviceUrl ?? service.serviceUrl,
    errorMessage: event.status === "failed" ? (event.errorMessage ?? service.errorMessage) : null,
    failedStep: event.status === "failed" ? (event.failedStep ?? service.failedStep) : null,
    updatedAt: event.updatedAt,
  };
}
