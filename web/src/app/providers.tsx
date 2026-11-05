"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ProvisioningHubProvider } from "@/lib/hub";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          // Live data comes from the hub, so don't refetch just because the window regained focus.
          queries: { staleTime: 30_000, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ProvisioningHubProvider>{children}</ProvisioningHubProvider>
    </QueryClientProvider>
  );
}
