"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SceneLink, sceneLinksQueryKey } from "./useSceneLinks";

export interface UpdateSceneLinkInput {
  id: string;
  label: string | null;
}

async function updateSceneLink(campaignId: string, { id, label }: UpdateSceneLinkInput): Promise<SceneLink> {
  const response = await fetch(`/api/campaigns/${campaignId}/scene-links/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label }),
  });
  if (!response.ok) {
    throw new Error("Failed to update link");
  }
  return response.json();
}

interface MutationContext {
  previous?: SceneLink[];
}

/** Optimistic label edit from the edge's selected mini-editor. */
export function useUpdateSceneLink(campaignId: string) {
  const queryClient = useQueryClient();
  const queryKey = sceneLinksQueryKey(campaignId);

  return useMutation<SceneLink, Error, UpdateSceneLinkInput, MutationContext>({
    mutationFn: (input) => updateSceneLink(campaignId, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<SceneLink[]>(queryKey);

      queryClient.setQueryData<SceneLink[]>(queryKey, (current) =>
        current?.map((link) => (link.id === input.id ? { ...link, label: input.label } : link)),
      );

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
