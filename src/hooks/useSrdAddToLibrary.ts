"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { EntityType } from "@/components/ui";
import { Entity, entitiesQueryKey, libraryScope } from "./useEntities";

export interface SrdAddToLibraryInput {
  srdEntryId: string;
}

async function addFromSrdToLibrary(input: SrdAddToLibraryInput): Promise<Entity> {
  const response = await fetch("/api/library/entities/from-srd", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error("Failed to add from SRD to library");
  }
  return response.json();
}

/** Library's SRD view "Add to library": srdAddToLibrary, then the My library list refreshes. */
export function useSrdAddToLibrary(type: EntityType) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SrdAddToLibraryInput) => addFromSrdToLibrary(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entitiesQueryKey(libraryScope, type) });
    },
  });
}
