import { expect, test } from "@playwright/test";
import { MockApi } from "./mock-api";

test("create a service and watch it provision live", async ({ page }) => {
  const api = new MockApi(page);
  await api.install();

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "No services yet" })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Live updates" })).toContainText("Live");

  // Empty state links straight to the form.
  await page.getByRole("link", { name: "Create your first service" }).click();
  await expect(page.getByRole("heading", { name: "New service" })).toBeVisible();

  // Submitting empty puts focus on the first invalid field.
  await page.getByRole("button", { name: "Create service" }).click();
  await expect(page.getByLabel("Service name")).toBeFocused();
  await expect(page.getByText("Enter a service name.")).toBeVisible();

  await page.getByLabel("Service name").fill("payments-api");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab"); // past the language select
  await page.keyboard.type("octocat");
  await page.getByLabel("Description").fill("Handles payment processing");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");

  // Lands on the live view with focus on the heading.
  await expect(page).toHaveURL(/\/services\/3f2b6c1e/);
  const heading = page.getByRole("heading", { level: 1, name: "payments-api" });
  await expect(heading).toBeFocused();
  await expect(page.getByText("Queued", { exact: true })).toBeVisible();
  await expect.poll(() => api.connected).toBe(true);

  const id = api.services[0].id as string;
  const steps = page.getByRole("list", { name: "Provisioning steps" }).getByRole("listitem");
  const current = page.locator('[aria-current="step"]');

  api.pushStatus(id, { status: "creating_repo" });
  await expect(current).toContainText("GitHub repository");

  api.pushStatus(id, { status: "adding_dockerfile" });
  await expect(current).toContainText("Dockerfile");
  await expect(steps.nth(0)).toContainText("Done");

  api.pushStatus(id, { status: "adding_ci" });
  api.pushStatus(id, { status: "generating_readme" });
  api.pushStatus(id, { status: "deploying_k8s", repoUrl: "https://github.com/octocat/payments-api" });
  await expect(current).toContainText("Kubernetes");
  await expect(page.getByRole("link", { name: /github\.com\/octocat\/payments-api/ })).toBeVisible();

  api.pushStatus(id, { status: "deployed", serviceUrl: "http://payments-api.example.com" });
  await expect(page.getByText("Deployed", { exact: true })).toBeVisible();
  await expect(current).toHaveCount(0);
  for (let i = 0; i < 5; i++) await expect(steps.nth(i)).toContainText("Done");

  // The list reflects the final state.
  await page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "Services" }).click();
  const row = page.getByRole("row", { name: /payments-api/ });
  await expect(row).toContainText("Deployed");
});

test("a failed run shows which step broke and why", async ({ page }) => {
  const api = new MockApi(page);
  await api.install();
  api.services.push({
    id: "3f2b6c1e-0000-4000-8000-000000000002",
    name: "search-api",
    language: "python",
    owner: "octocat",
    description: null,
    status: "deploying_k8s",
    repoUrl: "https://github.com/octocat/search-api",
    serviceUrl: null,
    errorMessage: null,
    failedStep: null,
    createdAt: new Date(Date.now() - 60_000).toISOString(),
    updatedAt: new Date(Date.now() - 30_000).toISOString(),
  });

  await page.goto("/services/3f2b6c1e-0000-4000-8000-000000000002");
  await expect.poll(() => api.connected).toBe(true);

  api.pushStatus("3f2b6c1e-0000-4000-8000-000000000002", {
    status: "failed",
    failedStep: "deploying_k8s",
    errorMessage: "namespaces \"search-api\" is forbidden",
  });

  const alert = page.getByRole("alert").filter({ hasText: "Provisioning failed" });
  await expect(alert).toContainText("Provisioning failed at Kubernetes");
  await expect(alert).toContainText('namespaces "search-api" is forbidden');
  const steps = page.getByRole("list", { name: "Provisioning steps" }).getByRole("listitem");
  await expect(steps.nth(3)).toContainText("Done");
  await expect(steps.nth(4)).toContainText("Failed");
});
