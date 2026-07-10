"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { campaignsQueryKey } from "./useCampaigns";
import { Scene, scenesQueryKey } from "./useScenes";

export interface CreateSceneInput {
  name: string;
}

async function createScene(campaignId: string, input: CreateSceneInput): Promise<Scene> {
  const response = await fetch(`/api/campaigns/${campaignId}/scenes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error("Failed to create scene");
  }
  return response.json();
}

export function useCreateScene(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateSceneInput) => createScene(campaignId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scenesQueryKey(campaignId) });
      // A new scene changes the campaign card's scene count on the dashboard.
      queryClient.invalidateQueries({ queryKey: campaignsQueryKey });
    },
  });
}
