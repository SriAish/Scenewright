/*
  Mirrors the NpcData/MonsterData/ItemData interfaces in
  src/hooks/useEntities.ts, which itself duplicates src/lib/entities/
  schemas.ts's zod shapes as plain TS interfaces (that file's own
  comment: "identical shape"). This module needs the same shapes but
  can't import useEntities.ts, a "use client" file, into server-only
  export code, so it repeats the existing duplication rather than
  introducing a third pattern.
*/

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
