"use client";

import { useQuery } from "@tanstack/react-query";

export type SceneStatus = "not_run" | "running" | "completed" | "skipped";

export interface Scene {
  id: string;
  campaignId: string;
  name: string;
  status: SceneStatus;
  startJson: unknown;
  endJson: unknown;
  narrationJson: unknown;
  mapImagePath: string | null;
  mapSourceUrl: string | null;
  sortIndex: number;
  graphX: number | null;
  graphY: number | null;
  updatedAt: string;
}

export function scenesQueryKey(campaignId: string) {
  return ["campaigns", campaignId, "scenes"] as const;
}

async function fetchScenes(campaignId: string): Promise<Scene[]> {
  const response = await fetch(`/api/campaigns/${campaignId}/scenes`);
  if (!response.ok) {
    throw new Error("Failed to load scenes");
  }
  return response.json();
}

export function useScenes(campaignId: string) {
  return useQuery({
    queryKey: scenesQueryKey(campaignId),
    queryFn: () => fetchScenes(campaignId),
  });
}
