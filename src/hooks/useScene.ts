"use client";

import { useQuery } from "@tanstack/react-query";
import { EntityType } from "@/components/ui";
import { SceneStatus } from "./useScenes";

export interface ScenePredecessor {
  id: string;
  name: string;
  endJson: unknown;
}

export interface SceneSidebarEntity {
  id: string;
  type: EntityType;
  name: string;
  summary: string;
  imagePath: string | null;
  deletedAt: string | null;
  /** False for mention-derived (auto) entries: the mention wins the dedup, see scene_entities' schema comment. */
  manual: boolean;
}

export interface SceneDetail {
  id: string;
  campaignId: string;
  name: string;
  status: SceneStatus;
  startJson: unknown;
  narrationJson: unknown;
  endJson: unknown;
  mapImagePath: string | null;
  /** Short-lived signed read URL, recomputed on every fetch; null when no map is set. */
  mapImageUrl: string | null;
  mapSourceUrl: string | null;
  sortIndex: number;
  graphX: number | null;
  graphY: number | null;
  updatedAt: string;
  predecessors: ScenePredecessor[];
  sidebarEntities: SceneSidebarEntity[];
}

export function sceneQueryKey(campaignId: string, sceneId: string) {
  return ["campaigns", campaignId, "scenes", sceneId] as const;
}

async function fetchScene(campaignId: string, sceneId: string): Promise<SceneDetail> {
  const response = await fetch(`/api/campaigns/${campaignId}/scenes/${sceneId}`);
  if (!response.ok) {
    throw new Error("Failed to load scene");
  }
  return response.json();
}

export function useScene(campaignId: string, sceneId: string) {
  return useQuery({
    queryKey: sceneQueryKey(campaignId, sceneId),
    queryFn: () => fetchScene(campaignId, sceneId),
  });
}
