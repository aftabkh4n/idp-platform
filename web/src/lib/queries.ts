import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { fetchService, fetchServices } from "./api";
import { applyStatusEvent } from "./provisioning";
import type { ProvisionedService, StatusChangedEvent } from "./types";

export const serviceKeys = {
  all: ["services"] as const,
  list: () => [...serviceKeys.all, "list"] as const,
  detail: (id: string) => [...serviceKeys.all, "detail", id] as const,
};

export const servicesQuery = () =>
  queryOptions({
    queryKey: serviceKeys.list(),
    queryFn: ({ signal }) => fetchServices(signal),
  });

export const serviceQuery = (id: string) =>
  queryOptions({
    queryKey: serviceKeys.detail(id),
    queryFn: ({ signal }) => fetchService(id, signal),
  });

/** Write a hub event into the cached list and detail entries. */
export function applyEventToCache(queryClient: QueryClient, event: StatusChangedEvent) {
  queryClient.setQueryData<ProvisionedService>(serviceKeys.detail(event.serviceId), (old) =>
    old ? applyStatusEvent(old, event) : old,
  );

  const list = queryClient.getQueryData<ProvisionedService[]>(serviceKeys.list());
  if (!list) return;

  if (list.some((s) => s.id === event.serviceId)) {
    queryClient.setQueryData<ProvisionedService[]>(serviceKeys.list(), (old) =>
      old?.map((s) => applyStatusEvent(s, event)),
    );
  } else {
    // Created somewhere else (another tab, another user, the API directly).
    void queryClient.invalidateQueries({ queryKey: serviceKeys.list() });
  }
}
