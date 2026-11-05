"use client";

import { useHubState, type HubState } from "@/lib/hub";

const COPY: Record<HubState, { label: string; title: string }> = {
  connecting: { label: "Connecting…", title: "Connecting to live updates" },
  connected: { label: "Live", title: "Receiving live provisioning updates" },
  reconnecting: { label: "Reconnecting…", title: "Lost the live connection, reconnecting" },
  offline: { label: "Offline", title: "Live updates unavailable. Refreshing every few seconds instead." },
};

export function ConnectionBadge() {
  const state = useHubState();
  const { label, title } = COPY[state];
  return (
    <span className="connection" data-state={state} role="status" title={title}>
      <span className="connection-dot" aria-hidden="true" />
      <span className="visually-hidden">Live updates: </span>
      {label}
    </span>
  );
}
