"use client";

import { useQuery } from "@tanstack/react-query";

export interface SrdSearchRow {
  id: string;
  type: "monster" | "item";
  name: string;
  data: unknown;
  cr: string | null;
  monsterType: string | null;
  size: string | null;
  environment: string[] | null;
  alignment: string | null;
  rarity: string | null;
  category: string | null;
  attunement: boolean | null;
}

export interface SrdSearchPage {
  results: SrdSearchRow[];
  hasMore: boolean;
}

export interface MonsterFilterState {
  crMin?: number;
  crMax?: number;
  monsterType?: string;
  size?: string;
  environment?: string;
  alignment?: string;
}

export interface ItemFilterState {
  rarity?: string;
  category?: string;
  attunement?: boolean;
}

export type SrdFilterState = MonsterFilterState | ItemFilterState;

export interface UseSrdSearchParams {
  type: "monster" | "item";
  filters: SrdFilterState;
  prose: string;
  browse: boolean;
  limit?: number;
  page?: number;
  /** Browse-mode-only name filter, used by the library's SRD source view. The finder never sets this. */
  name?: string;
  enabled: boolean;
}

function buildQueryString(params: UseSrdSearchParams): string {
  const search = new URLSearchParams();
  search.set("type", params.type);
  if (params.browse) {
    search.set("browse", "true");
    search.set("page", String(params.page ?? 1));
    if (params.name?.trim()) search.set("name", params.name.trim());
  } else {
    search.set("limit", String(params.limit ?? 3));
    if (params.prose.trim()) search.set("prose", params.prose.trim());
  }
  for (const [key, value] of Object.entries(params.filters)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  return search.toString();
}

async function fetchSrdSearch(params: UseSrdSearchParams): Promise<SrdSearchPage> {
  const response = await fetch(`/api/srd-entries?${buildQueryString(params)}`);
  if (!response.ok) {
    throw new Error("Failed to search SRD entries");
  }
  return response.json();
}

export function useSrdSearch(params: UseSrdSearchParams) {
  return useQuery({
    queryKey: ["srd-entries", params],
    queryFn: () => fetchSrdSearch(params),
    enabled: params.enabled,
    placeholderData: (previous) => previous,
  });
}
