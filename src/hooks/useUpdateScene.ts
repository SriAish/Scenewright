"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Scene, scenesQueryKey, SceneStatus } from "./useScenes";

export interface UpdateSceneInput {
  id: string;
  name?: string;
  status?: SceneStatus;
  startJson?: unknown;
  endJson?: unknown;
  narrationJson?: unknown;
  sortIndex?: number;
  graphX?: number | null;
  graphY?: number | null;
}

async function updateScene(campaignId: string, { id, ...values }: UpdateSceneInput): Promise<Scene> {
  const response = await fetch(`/api/campaigns/${campaignId}/scenes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  if (!response.ok) {
    throw new Error("Failed to update scene");
  }
  return response.json();
}

interface MutationContext {
  previous?: Scene[];
}

/*
  Optimistic on the client per the performance configuration: used for
  the row's inline status change, the scene page's name/status edits,
  the manual save of start/narration/end, and the graph view's node
  position (graphX/graphY) on drag end and auto-layout.
*/
export function useUpdateScene(campaignId: string) {
  const queryClient = useQueryClient();
  const queryKey = scenesQueryKey(campaignId);

  return useMutation<Scene, Error, UpdateSceneInput, MutationContext>({
    mutationFn: (input) => updateScene(campaignId, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Scene[]>(queryKey);

      queryClient.setQueryData<Scene[]>(queryKey, (current) =>
        current?.map((scene) => (scene.id === input.id ? { ...scene, ...input } : scene)),
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
