"use client";

import { useQuery } from "@tanstack/react-query";

export interface SrdFilterOptions {
  monsterType?: string[];
  size?: string[];
  alignment?: string[];
  environment?: string[];
  rarity?: string[];
  category?: string[];
}

async function fetchFilterOptions(type: "monster" | "item"): Promise<SrdFilterOptions> {
  const response = await fetch(`/api/srd-entries/filter-options?type=${type}`);
  if (!response.ok) {
    throw new Error("Failed to load filter options");
  }
  return response.json();
}

/** Dropdown option lists for the finder's structured filters, derived from what's actually in srd_entries. */
export function useSrdFilterOptions(type: "monster" | "item") {
  return useQuery({
    queryKey: ["srd-filter-options", type],
    queryFn: () => fetchFilterOptions(type),
    staleTime: Infinity,
  });
}
