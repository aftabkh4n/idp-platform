"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError } from "./api";
import { useHubState } from "./hub";
import { isTerminal } from "./provisioning";
import { serviceQuery, servicesQuery } from "./queries";

/** How often to poll while live updates are down. */
export const FALLBACK_POLL_MS = 5_000;

export function useServices() {
  const hub = useHubState();
  return useQuery({
    ...servicesQuery(),
    refetchInterval: (query) =>
      hub !== "connected" && query.state.data?.some((s) => !isTerminal(s.status)) ? FALLBACK_POLL_MS : false,
  });
}

export function useService(id: string) {
  const hub = useHubState();
  return useQuery({
    ...serviceQuery(id),
    // A 404 won't fix itself; other errors get the default retries.
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 3,
    refetchInterval: (query) =>
      hub !== "connected" && query.state.data && !isTerminal(query.state.data.status) ? FALLBACK_POLL_MS : false,
  });
}
