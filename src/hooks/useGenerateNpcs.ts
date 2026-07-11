"use client";

import { useMutation } from "@tanstack/react-query";
import { AbilityScores } from "./useEntities";

export interface GenerateNpcsInput {
  race?: string;
  sex?: string;
  alignment?: string;
  occupation?: string;
  plotHooks?: string;
}

export interface NpcCandidate {
  name: string;
  description: string;
  personalityTraits: string;
  abilityScores: AbilityScores;
  relationships: string;
  alignmentTendencies: string;
}

export interface GenerateNpcsResponse {
  candidates: NpcCandidate[];
  generatedOffline: boolean;
}

async function generateNpcs(input: GenerateNpcsInput): Promise<GenerateNpcsResponse> {
  const response = await fetch("/api/npc-generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error("Failed to generate NPCs");
  }
  return response.json();
}

/** Generate (and Reroll all): same request shape, always 3 fresh candidates. */
export function useGenerateNpcs() {
  return useMutation({ mutationFn: generateNpcs });
}
