import { statusLabel, statusTone } from "@/lib/provisioning";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className="badge" data-tone={statusTone(status)}>
      {statusTone(status) === "progress" && <span className="spinner" aria-hidden="true" />}
      {statusLabel(status)}
    </span>
  );
}
