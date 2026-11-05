import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { makeEvent, makeService } from "@/test/fixtures";
import { applyEventToCache, serviceKeys } from "./queries";
import type { ProvisionedService } from "./types";

describe("applyEventToCache", () => {
  it("updates the service in both the list and detail caches", () => {
    const qc = new QueryClient();
    const service = makeService();
    qc.setQueryData(serviceKeys.list(), [service, makeService({ id: "other", name: "other" })]);
    qc.setQueryData(serviceKeys.detail(service.id), service);

    applyEventToCache(qc, makeEvent({ status: "adding_dockerfile" }));

    expect(qc.getQueryData<ProvisionedService>(serviceKeys.detail(service.id))?.status).toBe("adding_dockerfile");
    const list = qc.getQueryData<ProvisionedService[]>(serviceKeys.list())!;
    expect(list.map((s) => s.status)).toEqual(["adding_dockerfile", "queued"]);
  });

  it("refetches the list when an event arrives for a service it doesn't have", () => {
    const qc = new QueryClient();
    qc.setQueryData(serviceKeys.list(), [makeService({ id: "other" })]);

    applyEventToCache(qc, makeEvent());

    expect(qc.getQueryState(serviceKeys.list())?.isInvalidated).toBe(true);
  });
});
