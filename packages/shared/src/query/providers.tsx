"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { createQueryClient } from "./query-client";

type QueryProvidersProps = {
  children: ReactNode;
};

/** Gives every component below it the TanStack Query client. Used in the root layout. */
export function QueryProviders({ children }: QueryProvidersProps) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
