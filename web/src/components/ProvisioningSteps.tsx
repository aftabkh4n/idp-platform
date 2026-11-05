import { getStepStates, STEPS, type StepState } from "@/lib/provisioning";
import type { ProvisionedService } from "@/lib/types";

const STATE_TEXT: Record<StepState, string> = {
  pending: "Waiting",
  active: "In progress",
  done: "Done",
  failed: "Failed",
  skipped: "Not run",
};

function StepIcon({ state }: { state: StepState }) {
  if (state === "active") return <span className="spinner spinner-lg" />;
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" focusable="false">
      {state === "done" && <path d="M5 10.5l3.2 3L15 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
      {state === "failed" && <path d="M6.5 6.5l7 7m0-7l-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />}
      {(state === "pending" || state === "skipped") && <circle cx="10" cy="10" r="3" fill="currentColor" />}
    </svg>
  );
}

type Props = { service: Pick<ProvisionedService, "status" | "failedStep" | "repoUrl"> };

export function ProvisioningSteps({ service }: Props) {
  const states = getStepStates(service);
  return (
    <ol className="steps" aria-label="Provisioning steps">
      {STEPS.map((step, i) => {
        const state = states[i];
        return (
          <li key={step.status} className="step" data-state={state} aria-current={state === "active" ? "step" : undefined}>
            <span className="step-icon" aria-hidden="true">
              <StepIcon state={state} />
            </span>
            <span className="step-body">
              <span className="step-label">{step.label}</span>
              <span className="step-detail">{step.detail}</span>
            </span>
            <span className="step-state">{STATE_TEXT[state]}</span>
          </li>
        );
      })}
    </ol>
  );
}
