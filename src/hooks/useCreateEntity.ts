"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { EntityType } from "@/components/ui";
import { Entity, entitiesQueryKey } from "./useEntities";

export interface CreateEntityInput {
  name: string;
}

async function createEntity(campaignId: string, type: EntityType, input: CreateEntityInput): Promise<Entity> {
  const response = await fetch(`/api/campaigns/${campaignId}/entities`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, ...input }),
  });
  if (!response.ok) {
    throw new Error("Failed to create entity");
  }
  return response.json();
}

export function useCreateEntity(campaignId: string, type: EntityType) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateEntityInput) => createEntity(campaignId, type, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entitiesQueryKey(campaignId, type) });
    },
  });
}
