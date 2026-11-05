import type { Page, Route, WebSocketRoute } from "@playwright/test";

/** Must match NEXT_PUBLIC_API_URL used for the build in playwright.config.ts. */
export const MOCK_API_URL = "http://localhost:5999";

const RS = "\u001e"; // SignalR JSON protocol message separator

/**
 * Stands in for the .NET API: the REST endpoints and the SignalR hub
 * (negotiate over HTTP, then the JSON hub protocol over a WebSocket).
 */
export class MockApi {
  services: Record<string, unknown>[] = [];
  private sockets: WebSocketRoute[] = [];

  constructor(private page: Page) {}

  async install() {
    const origin = "http://localhost:3100";
    const cors = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    };
    const reply = (route: Route, status: number, body?: unknown) =>
      route.fulfill({ status, headers: { ...cors, "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) });

    await this.page.route(`${MOCK_API_URL}/api/services**`, async (route) => {
      const req = route.request();
      const path = new URL(req.url()).pathname;
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });

      if (req.method() === "POST" && path === "/api/services") {
        const body = req.postDataJSON();
        const service = {
          id: "3f2b6c1e-0000-4000-8000-000000000001",
          ...body,
          status: "queued",
          repoUrl: null,
          serviceUrl: null,
          errorMessage: null,
          failedStep: null,
          createdAt: new Date().toISOString(),
          updatedAt: null,
        };
        this.services.unshift(service);
        return reply(route, 202, { id: service.id, status: "queued", statusUrl: `/api/services/${service.id}`, message: "" });
      }

      if (path === "/api/services") return reply(route, 200, this.services);

      const found = this.services.find((s) => path.endsWith(`/${s.id}`));
      return found ? reply(route, 200, found) : reply(route, 404, { title: "Not Found" });
    });

    await this.page.route(`${MOCK_API_URL}/hubs/provisioning/negotiate**`, (route) =>
      route.request().method() === "OPTIONS"
        ? route.fulfill({ status: 204, headers: cors })
        : reply(route, 200, {
            negotiateVersion: 1,
            connectionId: "conn",
            connectionToken: "token",
            availableTransports: [{ transport: "WebSockets", transferFormats: ["Text", "Binary"] }],
          }),
    );

    await this.page.routeWebSocket(/\/hubs\/provisioning/, (ws) => {
      ws.onMessage((message) => {
        for (const frame of String(message).split(RS).filter(Boolean)) {
          const msg = JSON.parse(frame);
          if ("protocol" in msg) {
            ws.send(`{}${RS}`); // handshake OK
            this.sockets.push(ws);
          }
        }
      });
    });
  }

  /** Update the stored service and push a StatusChanged message, as the worker does. */
  pushStatus(id: string, changes: Record<string, unknown>) {
    const service = this.services.find((s) => s.id === id)!;
    const updatedAt = new Date().toISOString();
    Object.assign(service, changes, { updatedAt });
    const event = {
      serviceId: id,
      serviceName: service.name,
      status: service.status,
      repoUrl: service.repoUrl,
      serviceUrl: service.serviceUrl,
      errorMessage: service.errorMessage,
      failedStep: service.failedStep,
      updatedAt,
    };
    const frame = JSON.stringify({ type: 1, target: "StatusChanged", arguments: [event] }) + RS;
    for (const ws of this.sockets) ws.send(frame);
  }

  get connected() {
    return this.sockets.length > 0;
  }
}
