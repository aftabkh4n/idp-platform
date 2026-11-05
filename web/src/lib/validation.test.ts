import { describe, expect, it } from "vitest";
import { toServiceRequest, validateServiceForm, type ServiceFormValues } from "./validation";

const valid: ServiceFormValues = { name: "payments-api", language: "node", owner: "octo-cat", description: "" };

describe("validateServiceForm", () => {
  it("accepts a valid form", () => {
    expect(validateServiceForm(valid)).toEqual({});
  });

  it.each([
    ["", "Enter a service name."],
    ["ab", "Use at least 3 characters."],
    ["Payments", "Use lowercase letters"],
    ["payments_api", "Use lowercase letters"],
    ["1payments", "Use lowercase letters"],
    ["payments-", "Use lowercase letters"],
    ["a".repeat(64), "63 characters or fewer"],
  ])("rejects the name %j", (name, message) => {
    expect(validateServiceForm({ ...valid, name }).name).toContain(message);
  });

  it.each(["-octocat", "octocat-", "octo--cat", "octo cat", "a".repeat(40)])("rejects the owner %j", (owner) => {
    expect(validateServiceForm({ ...valid, owner }).owner).toBeDefined();
  });

  it("rejects languages the backend has no template for", () => {
    expect(validateServiceForm({ ...valid, language: "cobol" }).language).toBe("Choose a language.");
  });
});

describe("toServiceRequest", () => {
  it("trims values and sends a blank description as null", () => {
    expect(toServiceRequest({ ...valid, name: " payments-api ", description: "  " })).toEqual({
      name: "payments-api",
      language: "node",
      owner: "octo-cat",
      description: null,
    });
  });
});
