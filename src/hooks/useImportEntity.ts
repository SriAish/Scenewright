"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { EntityType } from "@/components/ui";
import { Entity, campaignScope, entitiesQueryKey } from "./useEntities";

export interface ImportEntityInput {
  variantId: string;
  targetCampaignId: string;
  mentionStrategy: "flatten" | "copyReferenced";
}

async function importEntity(input: ImportEntityInput): Promise<Entity> {
  const response = await fetch("/api/registry/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error("Failed to import entity");
  }
  return response.json();
}

/** Screen 12's "Import copy": dispatches to crossCampaignImport or libraryImport server-side depending on the chosen variant's scope. */
export function useImportEntity(targetCampaignId: string, type: EntityType) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: importEntity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entitiesQueryKey(campaignScope(targetCampaignId), type) });
    },
  });
}
