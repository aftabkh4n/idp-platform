import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CreateServiceForm } from "./CreateServiceForm";

function renderForm() {
  const onCreated = vi.fn();
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <CreateServiceForm onCreated={onCreated} />
    </QueryClientProvider>,
  );
  return { onCreated, user: userEvent.setup() };
}

function mockFetch(response: Response | Error) {
  const fn = vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("CreateServiceForm", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("blocks an invalid submit and moves focus to the first problem", async () => {
    const fetch = mockFetch(json({}));
    const { user } = renderForm();

    await user.type(screen.getByLabelText("Owner"), "octocat");
    await user.click(screen.getByRole("button", { name: "Create service" }));

    const name = screen.getByLabelText("Service name");
    expect(name).toHaveFocus();
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAccessibleDescription(expect.stringContaining("Enter a service name."));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("clears an error as soon as the field becomes valid", async () => {
    mockFetch(json({}));
    const { user } = renderForm();
    const name = screen.getByLabelText("Service name");

    await user.type(name, "Bad Name");
    await user.tab();
    expect(screen.getByText(/Use lowercase letters/)).toBeInTheDocument();

    await user.clear(name);
    await user.type(name, "good-name");
    expect(screen.queryByText(/Use lowercase letters/)).not.toBeInTheDocument();
  });

  it("posts the request and hands back the new service id", async () => {
    const fetch = mockFetch(json({ id: "abc", status: "queued", statusUrl: "/api/services/abc", message: "" }, 202));
    const { user, onCreated } = renderForm();

    await user.type(screen.getByLabelText("Service name"), "payments-api");
    await user.selectOptions(screen.getByLabelText("Language"), "python");
    await user.type(screen.getByLabelText("Owner"), "octocat");
    await user.click(screen.getByRole("button", { name: "Create service" }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith("abc"));
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/api\/services$/);
    expect(JSON.parse(init.body as string)).toEqual({
      name: "payments-api",
      language: "python",
      owner: "octocat",
      description: null,
    });
  });

  it("shows server validation errors against the right field", async () => {
    mockFetch(json({ title: "One or more validation errors occurred.", errors: { Owner: ["Owner is unknown."] } }, 400));
    const { user, onCreated } = renderForm();

    await user.type(screen.getByLabelText("Service name"), "payments-api");
    await user.type(screen.getByLabelText("Owner"), "octocat");
    await user.click(screen.getByRole("button", { name: "Create service" }));

    expect(await screen.findByText("Owner is unknown.")).toBeInTheDocument();
    expect(screen.getByLabelText("Owner")).toHaveFocus();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("explains when the API can't be reached", async () => {
    mockFetch(new TypeError("Failed to fetch"));
    const { user } = renderForm();

    await user.type(screen.getByLabelText("Service name"), "payments-api");
    await user.type(screen.getByLabelText("Owner"), "octocat");
    await user.click(screen.getByRole("button", { name: "Create service" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Can't reach the IDP API");
    await waitFor(() => expect(alert).toHaveFocus());
  });
});
