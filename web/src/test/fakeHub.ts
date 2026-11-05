import type { HubConnection } from "@microsoft/signalr";

type Handler = (...args: never[]) => void;

/** Just enough of HubConnection for ProvisioningHubProvider, driven by the test. */
export class FakeHub {
  handlers = new Map<string, Handler>();
  reconnecting?: () => void;
  reconnected?: () => void;
  closed?: () => void;
  start = vi.fn(async () => {});
  stop = vi.fn(async () => {});

  on(name: string, handler: Handler) {
    this.handlers.set(name, handler);
  }
  onreconnecting(cb: () => void) {
    this.reconnecting = cb;
  }
  onreconnected(cb: () => void) {
    this.reconnected = cb;
  }
  onclose(cb: () => void) {
    this.closed = cb;
  }

  /** Simulate the server sending a hub message. */
  emit(name: string, payload: unknown) {
    (this.handlers.get(name) as ((p: unknown) => void) | undefined)?.(payload);
  }

  asConnection() {
    return this as unknown as HubConnection;
  }
}
