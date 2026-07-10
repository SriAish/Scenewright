"use client";

import { useQuery } from "@tanstack/react-query";

export interface SceneLink {
  id: string;
  campaignId: string;
  fromSceneId: string;
  toSceneId: string;
  label: string | null;
  updatedAt: string;
}

export function sceneLinksQueryKey(campaignId: string) {
  return ["campaigns", campaignId, "scene-links"] as const;
}

async function fetchSceneLinks(campaignId: string): Promise<SceneLink[]> {
  const response = await fetch(`/api/campaigns/${campaignId}/scene-links`);
  if (!response.ok) {
    throw new Error("Failed to load scene links");
  }
  return response.json();
}

export function useSceneLinks(campaignId: string) {
  return useQuery({
    queryKey: sceneLinksQueryKey(campaignId),
    queryFn: () => fetchSceneLinks(campaignId),
  });
}
