"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchHistory, type HistoryFilters } from "../api/history";

/** The start of the key of every history list in the TanStack Query client. */
export const historyQueryKey = ["history"] as const;

/** One page of the history entries, for the given filters. */
export function useHistory(filters: HistoryFilters) {
  return useQuery({
    queryKey: [...historyQueryKey, filters],
    queryFn: () => fetchHistory(filters),
  });
}
