"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SceneLink, sceneLinksQueryKey } from "./useSceneLinks";

export interface CreateSceneLinkInput {
  fromSceneId: string;
  toSceneId: string;
  label?: string | null;
}

function extractErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== "object" || !("error" in body)) return null;
  const error = (body as { error: unknown }).error;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "fieldErrors" in error) {
    const fieldErrors = (error as { fieldErrors: Record<string, string[]> }).fieldErrors;
    const first = Object.values(fieldErrors).flat()[0];
    if (first) return first;
  }
  return null;
}

async function createSceneLink(campaignId: string, input: CreateSceneLinkInput): Promise<SceneLink> {
  const response = await fetch(`/api/campaigns/${campaignId}/scene-links`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(extractErrorMessage(body) ?? "Failed to create link");
  }
  return response.json();
}

interface MutationContext {
  previous?: SceneLink[];
}

/*
  Optimistic on the client: drawing an edge in the graph inserts a
  temporary row immediately, replaced by the real one once the request
  settles via invalidation, so the edge appears without delay.
*/
export function useCreateSceneLink(campaignId: string) {
  const queryClient = useQueryClient();
  const queryKey = sceneLinksQueryKey(campaignId);

  return useMutation<SceneLink, Error, CreateSceneLinkInput, MutationContext>({
    mutationFn: (input) => createSceneLink(campaignId, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<SceneLink[]>(queryKey);

      queryClient.setQueryData<SceneLink[]>(queryKey, (current) => [
        ...(current ?? []),
        {
          id: `temp-${crypto.randomUUID()}`,
          campaignId,
          fromSceneId: input.fromSceneId,
          toSceneId: input.toSceneId,
          label: input.label ?? null,
          updatedAt: new Date().toISOString(),
        },
      ]);

      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
