"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { campaignsQueryKey } from "./useCampaigns";
import { Scene, scenesQueryKey } from "./useScenes";

async function deleteScene(campaignId: string, sceneId: string): Promise<void> {
  const response = await fetch(`/api/campaigns/${campaignId}/scenes/${sceneId}`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error("Failed to delete scene");
  }
}

interface MutationContext {
  previous?: Scene[];
}

/*
  Optimistic on the client per the performance configuration. Hard
  delete on the server, cascading to the scene's scene_links rows in
  the same transaction, so nothing here needs undo beyond the UI list.
*/
export function useDeleteScene(campaignId: string) {
  const queryClient = useQueryClient();
  const queryKey = scenesQueryKey(campaignId);

  return useMutation<void, Error, string, MutationContext>({
    mutationFn: (sceneId) => deleteScene(campaignId, sceneId),
    onMutate: async (sceneId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Scene[]>(queryKey);

      queryClient.setQueryData<Scene[]>(queryKey, (current) => current?.filter((scene) => scene.id !== sceneId));

      return { previous };
    },
    onError: (_error, _sceneId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: campaignsQueryKey });
    },
  });
}
