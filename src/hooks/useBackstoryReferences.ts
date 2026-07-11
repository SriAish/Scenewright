"use client";

import { useMutation } from "@tanstack/react-query";

export interface BackstoryReferencesInput {
  entityId: string;
  /** A campaign id, or the literal "library". */
  target: string;
}

export interface BackstoryReferencesResult {
  names: string[];
}

async function fetchBackstoryReferences({ entityId, target }: BackstoryReferencesInput): Promise<BackstoryReferencesResult> {
  const response = await fetch(
    `/api/registry/entities/${entityId}/backstory-references?target=${encodeURIComponent(target)}`,
  );
  if (!response.ok) {
    throw new Error("Failed to check backstory references");
  }
  return response.json();
}

/**
 * Preview for screen 12's confirm step and Save-to-library: which of a
 * variant's backstory-mentioned entities fall outside the target scope,
 * checked before committing the fork so the confirm step can show real
 * names and an accurate N-count.
 */
export function useBackstoryReferences() {
  return useMutation({ mutationFn: fetchBackstoryReferences });
}
