"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Scene, scenesQueryKey } from "./useScenes";

async function reorderScenes(campaignId: string, sceneIds: string[]): Promise<void> {
  const response = await fetch(`/api/campaigns/${campaignId}/scenes/reorder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sceneIds }),
  });
  if (!response.ok) {
    throw new Error("Failed to reorder scenes");
  }
}

interface MutationContext {
  previous?: Scene[];
}

/** Optimistic drag-to-reorder: the row order updates immediately, sort_index rewritten transactionally on the server. */
export function useReorderScenes(campaignId: string) {
  const queryClient = useQueryClient();
  const queryKey = scenesQueryKey(campaignId);

  return useMutation<void, Error, string[], MutationContext>({
    mutationFn: (sceneIds) => reorderScenes(campaignId, sceneIds),
    onMutate: async (sceneIds) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Scene[]>(queryKey);

      queryClient.setQueryData<Scene[]>(queryKey, (current) => {
        if (!current) return current;
        const byId = new Map(current.map((scene) => [scene.id, scene]));
        return sceneIds
          .map((id, index) => {
            const scene = byId.get(id);
            return scene ? { ...scene, sortIndex: index } : null;
          })
          .filter((scene): scene is Scene => scene !== null);
      });

      return { previous };
    },
    onError: (_error, _sceneIds, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
