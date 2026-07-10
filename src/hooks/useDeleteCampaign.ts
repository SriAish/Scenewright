"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Campaign, campaignsQueryKey } from "./useCampaigns";

async function deleteCampaign(id: string): Promise<void> {
  const response = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error("Failed to delete campaign");
  }
}

interface MutationContext {
  previous?: Campaign[];
}

/*
  Optimistic on the client per the performance configuration: the card
  disappears immediately, reconciled against the server in the
  background, restored on error. Soft delete on the server; the row
  stays recoverable in the database, it just leaves this list.
*/
export function useDeleteCampaign() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string, MutationContext>({
    mutationFn: deleteCampaign,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: campaignsQueryKey });
      const previous = queryClient.getQueryData<Campaign[]>(campaignsQueryKey);

      queryClient.setQueryData<Campaign[]>(campaignsQueryKey, (current) =>
        current?.filter((campaign) => campaign.id !== id),
      );

      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(campaignsQueryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: campaignsQueryKey });
    },
  });
}
