"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { EntityType } from "@/components/ui";
import { Entity, EntityScope, entitiesQueryKey, entityScopeBasePath } from "./useEntities";

export interface CreateEntityInput {
  name: string;
}

async function createEntity(scope: EntityScope, type: EntityType, input: CreateEntityInput): Promise<Entity> {
  const response = await fetch(entityScopeBasePath(scope), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, ...input }),
  });
  if (!response.ok) {
    throw new Error("Failed to create entity");
  }
  return response.json();
}

export function useCreateEntity(scope: EntityScope, type: EntityType) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateEntityInput) => createEntity(scope, type, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entitiesQueryKey(scope, type) });
    },
  });
}
