"use client";

import { useQuery } from "@tanstack/react-query";
import { EntityType } from "@/components/ui";

export interface RegistryVariant {
  id: string;
  name: string;
  summary: string;
  type: EntityType;
  sourceLabel: string;
  campaignId: string | null;
  isDeletedCampaign: boolean;
}

export interface RegistryGroup {
  effectiveRootId: string;
  type: EntityType;
  headerName: string;
  headerSummary: string;
  versionCount: number;
  variants: RegistryVariant[];
}

export interface UseRegistrySearchParams {
  type: EntityType;
  query: string;
  includeDeletedCampaigns: boolean;
  excludeCampaignId?: string;
}

function buildQueryString(params: UseRegistrySearchParams): string {
  const search = new URLSearchParams();
  search.set("type", params.type);
  if (params.query.trim()) search.set("q", params.query.trim());
  if (params.includeDeletedCampaigns) search.set("includeDeletedCampaigns", "true");
  if (params.excludeCampaignId) search.set("excludeCampaignId", params.excludeCampaignId);
  return search.toString();
}

async function fetchRegistry(params: UseRegistrySearchParams): Promise<RegistryGroup[]> {
  const response = await fetch(`/api/registry?${buildQueryString(params)}`);
  if (!response.ok) {
    throw new Error("Failed to search the registry");
  }
  return response.json();
}

/** Screen 12's import modal, backed by src/lib/registry's searchRegistry. */
export function useRegistrySearch(params: UseRegistrySearchParams) {
  return useQuery({
    queryKey: ["registry", params],
    queryFn: () => fetchRegistry(params),
    placeholderData: (previous) => previous,
  });
}
