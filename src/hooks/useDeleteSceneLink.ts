"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SceneLink, sceneLinksQueryKey } from "./useSceneLinks";

async function deleteSceneLink(campaignId: string, linkId: string): Promise<void> {
  const response = await fetch(`/api/campaigns/${campaignId}/scene-links/${linkId}`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error("Failed to delete link");
  }
}

interface MutationContext {
  previous?: SceneLink[];
}

/** Optimistic delete from the edge's selected mini-editor. */
export function useDeleteSceneLink(campaignId: string) {
  const queryClient = useQueryClient();
  const queryKey = sceneLinksQueryKey(campaignId);

  return useMutation<void, Error, string, MutationContext>({
    mutationFn: (linkId) => deleteSceneLink(campaignId, linkId),
    onMutate: async (linkId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<SceneLink[]>(queryKey);

      queryClient.setQueryData<SceneLink[]>(queryKey, (current) => current?.filter((link) => link.id !== linkId));

      return { previous };
    },
    onError: (_error, _linkId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
