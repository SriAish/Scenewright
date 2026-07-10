"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";

/*
  Module-scope QueryClient, per the performance configuration. Safe as
  a module-scope singleton here because this file only ever runs in
  the browser (Client Component boundary), so it is one client per
  browser session, never shared across different users' server
  requests.
*/
const queryClient = new QueryClient();

export function QueryProvider({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
