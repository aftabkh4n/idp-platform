"use client";

import {
  HubConnectionBuilder,
  LogLevel,
  type HubConnection,
  type IRetryPolicy,
} from "@microsoft/signalr";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { HUB_URL } from "./config";
import { applyEventToCache, serviceKeys } from "./queries";
import type { StatusChangedEvent } from "./types";

export type HubState = "connecting" | "connected" | "reconnecting" | "offline";

const HubStateContext = createContext<HubState>("connecting");

export function useHubState() {
  return useContext(HubStateContext);
}

/** Back off to 30s between attempts and never give up. */
export function retryDelay(attempt: number) {
  return Math.min(30_000, 1_000 * 2 ** attempt);
}

const retryForever: IRetryPolicy = {
  nextRetryDelayInMilliseconds: ({ previousRetryCount }) =>
    previousRetryCount === 0 ? 0 : retryDelay(previousRetryCount - 1),
};

export function createHubConnection(url = HUB_URL): HubConnection {
  return new HubConnectionBuilder()
    .withUrl(url)
    .withAutomaticReconnect(retryForever)
    .configureLogging(LogLevel.Warning)
    .build();
}

interface ProviderProps {
  children: ReactNode;
  /** Injected in tests. */
  createConnection?: () => HubConnection;
}

/**
 * Owns the single SignalR connection for the app and writes every
 * StatusChanged event straight into the TanStack Query cache, so any
 * component reading a service re-renders with live data.
 */
export function ProvisioningHubProvider({ children, createConnection = createHubConnection }: ProviderProps) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<HubState>("connecting");

  useEffect(() => {
    const connection = createConnection();
    let disposed = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    // Events sent while we weren't connected are lost, so refetch to catch up.
    const resync = () => queryClient.invalidateQueries({ queryKey: serviceKeys.all });

    // ProvisioningHub greets each client on connect; nothing to do with it.
    connection.on("Connected", () => {});
    connection.on("StatusChanged", (event: StatusChangedEvent) => applyEventToCache(queryClient, event));
    connection.onreconnecting(() => setState("reconnecting"));
    connection.onreconnected(() => {
      setState("connected");
      void resync();
    });
    // Only reached if automatic reconnect stops (or the first start fails).
    connection.onclose(() => {
      if (disposed) return;
      setState("offline");
      scheduleStart(0);
    });

    function scheduleStart(attempt: number) {
      clearTimeout(retryTimer);
      retryTimer = setTimeout(() => void start(attempt), retryDelay(attempt));
    }

    // withAutomaticReconnect doesn't cover the initial connection, so retry that ourselves.
    async function start(attempt: number) {
      if (disposed) return;
      try {
        await connection.start();
        if (disposed) return;
        setState("connected");
        if (attempt > 0) void resync();
      } catch {
        if (disposed) return;
        setState("offline");
        scheduleStart(attempt + 1);
      }
    }

    void start(0);

    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      void connection.stop();
    };
  }, [createConnection, queryClient]);

  return <HubStateContext.Provider value={state}>{children}</HubStateContext.Provider>;
}
