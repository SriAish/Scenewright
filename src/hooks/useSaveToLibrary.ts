"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { EntityType } from "@/components/ui";
import { Entity, entitiesQueryKey, libraryScope } from "./useEntities";

export interface SaveToLibraryInput {
  campaignId: string;
  entityId: string;
  mentionStrategy: "flatten" | "copyReferenced";
}

async function saveToLibrary(input: SaveToLibraryInput): Promise<Entity> {
  const response = await fetch(`/api/campaigns/${input.campaignId}/entities/${input.entityId}/save-to-library`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mentionStrategy: input.mentionStrategy }),
  });
  if (!response.ok) {
    throw new Error("Failed to save to library");
  }
  return response.json();
}

/** Screen 9's "Save to library": reverse fork into library scope. */
export function useSaveToLibrary(type: EntityType) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveToLibrary,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entitiesQueryKey(libraryScope, type) });
    },
  });
}
