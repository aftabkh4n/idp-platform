import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConnectionBadge } from "@/components/ConnectionBadge";
import { FakeHub } from "@/test/fakeHub";
import { makeEvent, makeService } from "@/test/fixtures";
import { ProvisioningHubProvider } from "./hub";
import { serviceKeys } from "./queries";
import type { ProvisionedService } from "./types";

function setup(hub: FakeHub) {
  const qc = new QueryClient();
  const createConnection = () => hub.asConnection();
  render(
    <QueryClientProvider client={qc}>
      <ProvisioningHubProvider createConnection={createConnection}>
        <ConnectionBadge />
      </ProvisioningHubProvider>
    </QueryClientProvider>,
  );
  return qc;
}

describe("ProvisioningHubProvider", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("shows Live once connected and writes events into the cache", async () => {
    const hub = new FakeHub();
    const qc = setup(hub);
    const service = makeService();
    qc.setQueryData(serviceKeys.detail(service.id), service);

    await act(async () => {});
    expect(screen.getByRole("status")).toHaveTextContent("Live");

    act(() => hub.emit("StatusChanged", makeEvent({ status: "adding_ci" })));
    expect(qc.getQueryData<ProvisionedService>(serviceKeys.detail(service.id))?.status).toBe("adding_ci");
  });

  it("refetches everything after a reconnect, since events may have been missed", async () => {
    const hub = new FakeHub();
    const qc = setup(hub);
    qc.setQueryData(serviceKeys.list(), [makeService()]);
    await act(async () => {});

    act(() => hub.reconnecting?.());
    expect(screen.getByRole("status")).toHaveTextContent("Reconnecting");

    act(() => hub.reconnected?.());
    expect(screen.getByRole("status")).toHaveTextContent("Live");
    expect(qc.getQueryState(serviceKeys.list())?.isInvalidated).toBe(true);
  });

  it("keeps retrying when the first connection fails", async () => {
    const hub = new FakeHub();
    hub.start.mockRejectedValueOnce(new Error("refused")).mockRejectedValueOnce(new Error("refused"));
    setup(hub);

    await act(async () => {});
    expect(screen.getByRole("status")).toHaveTextContent("Offline");

    await act(() => vi.advanceTimersByTimeAsync(2_000)); // 2nd attempt after 2s fails
    await act(() => vi.advanceTimersByTimeAsync(4_000)); // 3rd attempt after 4s succeeds
    expect(hub.start).toHaveBeenCalledTimes(3);
    expect(screen.getByRole("status")).toHaveTextContent("Live");
  });
});
