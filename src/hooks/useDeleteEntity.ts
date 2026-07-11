"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { EntityType } from "@/components/ui";
import { Entity, EntityScope, entitiesQueryKey, entityScopeBasePath } from "./useEntities";

async function deleteEntity(scope: EntityScope, entityId: string): Promise<void> {
  const response = await fetch(`${entityScopeBasePath(scope)}/${entityId}`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error("Failed to delete entity");
  }
}

interface MutationContext {
  previous?: Entity[];
}

/*
  Optimistic on the client per the performance configuration. Soft
  delete on the server (deleted_at), so the list query is simply
  invalidated on settle rather than needing any undo beyond the UI list.
*/
export function useDeleteEntity(scope: EntityScope, type: EntityType) {
  const queryClient = useQueryClient();
  const queryKey = entitiesQueryKey(scope, type);

  return useMutation<void, Error, string, MutationContext>({
    mutationFn: (entityId) => deleteEntity(scope, entityId),
    onMutate: async (entityId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Entity[]>(queryKey);

      queryClient.setQueryData<Entity[]>(queryKey, (current) => current?.filter((entity) => entity.id !== entityId));

      return { previous };
    },
    onError: (_error, _entityId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
