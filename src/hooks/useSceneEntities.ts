"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sceneQueryKey } from "./useScene";

async function addSceneEntity(campaignId: string, sceneId: string, entityId: string): Promise<void> {
  const response = await fetch(`/api/campaigns/${campaignId}/scenes/${sceneId}/entities`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entityId }),
  });
  if (!response.ok) {
    throw new Error("Failed to add entity");
  }
}

/** Manual "Add" button in a sidebar Characters/Monsters/Items section. */
export function useAddSceneEntity(campaignId: string, sceneId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entityId: string) => addSceneEntity(campaignId, sceneId, entityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sceneQueryKey(campaignId, sceneId) });
    },
  });
}

async function removeSceneEntity(campaignId: string, sceneId: string, entityId: string): Promise<void> {
  const response = await fetch(`/api/campaigns/${campaignId}/scenes/${sceneId}/entities/${entityId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to remove entity");
  }
}

/** Remove control shown only on manual (dashed) chips; auto chips have none. */
export function useRemoveSceneEntity(campaignId: string, sceneId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entityId: string) => removeSceneEntity(campaignId, sceneId, entityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sceneQueryKey(campaignId, sceneId) });
    },
  });
}
