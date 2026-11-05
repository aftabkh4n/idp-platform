import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { makeService } from "@/test/fixtures";
import { ProvisioningSteps } from "./ProvisioningSteps";

describe("ProvisioningSteps", () => {
  it("marks the running step as the current one", () => {
    render(<ProvisioningSteps service={makeService({ status: "generating_readme" })} />);
    const current = screen.getAllByRole("listitem").find((li) => li.getAttribute("aria-current") === "step");
    expect(current).toHaveTextContent("README");
    expect(current).toHaveTextContent("In progress");
  });

  it("shows where a failed run stopped and what didn't run", () => {
    render(<ProvisioningSteps service={makeService({ status: "failed", failedStep: "deploying_k8s" })} />);
    const steps = screen.getAllByRole("listitem");
    expect(within(steps[3]).getByText("Done")).toBeInTheDocument();
    expect(within(steps[4]).getByText("Failed")).toBeInTheDocument();
  });
});
