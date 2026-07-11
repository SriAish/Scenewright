"use client";

import { useQuery } from "@tanstack/react-query";

export interface Option {
  value: string;
  label: string;
}

export interface GenerationOptions {
  races: Option[];
  sexes: Option[];
  alignments: Option[];
  occupations: Option[];
}

async function fetchGenerationOptions(): Promise<GenerationOptions> {
  const response = await fetch("/api/npc-generate");
  if (!response.ok) {
    throw new Error("Failed to load generation options");
  }
  return response.json();
}

/** Dropdown value sets for the NPC generation modal, straight from the table library / SRD / GM table. */
export function useNpcGenerationOptions() {
  return useQuery({
    queryKey: ["npc-generation-options"],
    queryFn: fetchGenerationOptions,
    staleTime: Infinity,
  });
}
