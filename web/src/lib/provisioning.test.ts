import { describe, expect, it } from "vitest";
import { makeEvent, makeService } from "@/test/fixtures";
import { applyStatusEvent, getStepStates } from "./provisioning";

describe("getStepStates", () => {
  it("leaves every step waiting while queued", () => {
    expect(getStepStates(makeService({ status: "queued" }))).toEqual([
      "pending", "pending", "pending", "pending", "pending",
    ]);
  });

  it("marks earlier steps done and the current one active", () => {
    expect(getStepStates(makeService({ status: "adding_ci" }))).toEqual([
      "done", "done", "active", "pending", "pending",
    ]);
  });

  it("marks everything done once deployed", () => {
    expect(getStepStates(makeService({ status: "deployed" }))).toEqual(Array(5).fill("done"));
  });

  it("pins a failure to the step that was running", () => {
    expect(getStepStates(makeService({ status: "failed", failedStep: "adding_dockerfile" }))).toEqual([
      "done", "failed", "skipped", "skipped", "skipped",
    ]);
  });

  it("falls back to the repo URL for failures recorded before failedStep existed", () => {
    expect(getStepStates(makeService({ status: "failed", repoUrl: "https://github.com/o/r" }))).toEqual([
      "done", "done", "done", "done", "failed",
    ]);
  });

  it("doesn't claim any step passed when the failure point is unknown", () => {
    expect(getStepStates(makeService({ status: "failed" }))).toEqual(Array(5).fill("skipped"));
  });

  it("treats an unknown status as waiting instead of crashing", () => {
    expect(getStepStates(makeService({ status: "scanning_image" }))).toEqual(Array(5).fill("pending"));
  });
});

describe("applyStatusEvent", () => {
  it("applies a newer event", () => {
    const next = applyStatusEvent(
      makeService(),
      makeEvent({ status: "deploying_k8s", repoUrl: "https://github.com/o/r" }),
    );
    expect(next.status).toBe("deploying_k8s");
    expect(next.repoUrl).toBe("https://github.com/o/r");
    expect(next.updatedAt).toBe("2026-11-05T10:00:05Z");
  });

  it("ignores an event older than what we already have", () => {
    const service = makeService({ status: "deploying_k8s", updatedAt: "2026-11-05T10:01:00Z" });
    expect(applyStatusEvent(service, makeEvent({ status: "adding_ci" }))).toBe(service);
  });

  it("ignores events for other services", () => {
    const service = makeService();
    expect(applyStatusEvent(service, makeEvent({ serviceId: "other" }))).toBe(service);
  });

  it("keeps the repo URL when a later event omits it", () => {
    const service = makeService({ status: "deploying_k8s", repoUrl: "https://github.com/o/r" });
    const next = applyStatusEvent(service, makeEvent({ status: "failed", errorMessage: "boom", failedStep: "deploying_k8s" }));
    expect(next).toMatchObject({ status: "failed", repoUrl: "https://github.com/o/r", errorMessage: "boom", failedStep: "deploying_k8s" });
  });
});
