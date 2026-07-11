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
  /** Library rows only: "Saved from [campaign]" per screen 13, root-derived per src/lib/registry's provenance rule. */
  copiedFrom?: string | null;
}

/**
 * Every entity CRUD/query hook is scoped either to one campaign or to
 * the library (campaign_id null), matching the two entity route trees
 * (/api/campaigns/[id]/entities and /api/library/entities). Library
 * scope carries no id since there's exactly one library per user.
 */
export type EntityScope = { type: "campaign"; campaignId: string } | { type: "library" };

export function campaignScope(campaignId: string): EntityScope {
  return { type: "campaign", campaignId };
}

export const libraryScope: EntityScope = { type: "library" };

export function entityScopeBasePath(scope: EntityScope): string {
  return scope.type === "campaign" ? `/api/campaigns/${scope.campaignId}/entities` : "/api/library/entities";
}

export function entitiesQueryKey(scope: EntityScope, type: EntityType) {
  return scope.type === "campaign"
    ? (["campaigns", scope.campaignId, "entities", type] as const)
    : (["library", "entities", type] as const);
}

async function fetchEntities(scope: EntityScope, type: EntityType): Promise<Entity[]> {
  const response = await fetch(`${entityScopeBasePath(scope)}?type=${type}`);
  if (!response.ok) {
    throw new Error("Failed to load entities");
  }
  return response.json();
}

export function useEntities(scope: EntityScope, type: EntityType) {
  return useQuery({
    queryKey: entitiesQueryKey(scope, type),
    queryFn: () => fetchEntities(scope, type),
  });
}
