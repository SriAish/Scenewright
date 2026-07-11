"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { EntityType } from "@/components/ui";
import { campaignScope, Entity, entitiesQueryKey } from "./useEntities";

export interface SrdAddInput {
  srdEntryId: string;
}

async function addFromSrd(campaignId: string, input: SrdAddInput): Promise<Entity> {
  const response = await fetch(`/api/campaigns/${campaignId}/entities/from-srd`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error("Failed to add from SRD");
  }
  return response.json();
}

/** Finder's "Add to campaign": srdAdd, then the entity tab list refreshes without a manual reload. */
export function useSrdAdd(campaignId: string, type: EntityType) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SrdAddInput) => addFromSrd(campaignId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entitiesQueryKey(campaignScope(campaignId), type) });
    },
  });
}
