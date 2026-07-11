"use client";

import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { EntityType } from "@/components/ui";
import { Entity, EntityScope, entitiesQueryKey, entityScopeBasePath, ItemData, MonsterData, NpcData } from "./useEntities";

export interface UpdateEntityInput {
  id: string;
  name?: string;
  summary?: string;
  data?: NpcData | MonsterData | ItemData;
  backstoryJson?: unknown;
}

async function updateEntity(
  scope: EntityScope,
  { id, ...values }: UpdateEntityInput,
): Promise<Entity> {
  const response = await fetch(`${entityScopeBasePath(scope)}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  if (!response.ok) {
    throw new Error("Failed to update entity");
  }
  return response.json();
}

interface MutationContext {
  previous?: Entity[];
}

/*
  Optimistic on the client per the performance configuration: used for
  every edit-in-place field on the entity detail page (name, summary,
  and all type-specific data fields commit individually on blur/change).

  Requests are chained through queueRef rather than fired independently:
  entities.data is one jsonb column, so every field's commit sends the
  entity's whole data object, not just its own key. Tabbing quickly
  between fields (e.g. filling all six ability scores) fires several of
  these in close succession; without ordering, a request built from an
  earlier snapshot can resolve after a later, fuller one and silently
  overwrite it. Chaining guarantees they reach the server in the order
  they were made.
*/
export function useUpdateEntity(scope: EntityScope, type: EntityType) {
  const queryClient = useQueryClient();
  const queryKey = entitiesQueryKey(scope, type);
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());

  return useMutation<Entity, Error, UpdateEntityInput, MutationContext>({
    mutationFn: (input) => {
      const run = () => updateEntity(scope, input);
      const result = queueRef.current.then(run, run);
      queueRef.current = result.catch(() => {});
      return result;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Entity[]>(queryKey);

      queryClient.setQueryData<Entity[]>(queryKey, (current) =>
        current?.map((entity) => (entity.id === input.id ? { ...entity, ...input } : entity)),
      );

      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
