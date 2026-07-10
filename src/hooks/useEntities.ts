"use client";

import { useQuery } from "@tanstack/react-query";
import { EntityType } from "@/components/ui";

export interface AbilityScores {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export interface MonsterAction {
  name: string;
  description: string;
}

export interface NpcData {
  description?: string;
  personalityTraits?: string;
  abilityScores?: AbilityScores;
  relationships?: string;
  alignmentTendencies?: string;
}

export interface MonsterData {
  cr?: string;
  type?: string;
  size?: string;
  ac?: number;
  hp?: number;
  speeds?: string;
  abilities?: AbilityScores;
  actions?: MonsterAction[];
  description?: string;
}

export interface ItemData {
  rarity?: string;
  category?: string;
  attunement?: boolean;
  description?: string;
}

export interface Entity {
  id: string;
  campaignId: string | null;
  type: EntityType;
  name: string;
  summary: string;
  data: NpcData | MonsterData | ItemData;
  backstoryJson: unknown;
  imagePath: string | null;
  lineageRootId: string | null;
  srdSourceId: string | null;
  updatedAt: string;
  sceneCount: number;
}

export function entitiesQueryKey(campaignId: string, type: EntityType) {
  return ["campaigns", campaignId, "entities", type] as const;
}

async function fetchEntities(campaignId: string, type: EntityType): Promise<Entity[]> {
  const response = await fetch(`/api/campaigns/${campaignId}/entities?type=${type}`);
  if (!response.ok) {
    throw new Error("Failed to load entities");
  }
  return response.json();
}

export function useEntities(campaignId: string, type: EntityType) {
  return useQuery({
    queryKey: entitiesQueryKey(campaignId, type),
    queryFn: () => fetchEntities(campaignId, type),
  });
}
