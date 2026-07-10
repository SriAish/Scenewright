"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Campaign, CampaignStatus, campaignsQueryKey } from "./useCampaigns";

export interface UpdateCampaignInput {
  id: string;
  title?: string;
  premise?: string | null;
  status?: CampaignStatus;
}

async function updateCampaign({ id, ...values }: UpdateCampaignInput): Promise<Campaign> {
  const response = await fetch(`/api/campaigns/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  if (!response.ok) {
    throw new Error("Failed to update campaign");
  }
  return response.json();
}

interface MutationContext {
  previous?: Campaign[];
}

/*
  Optimistic on the client per the performance configuration: the card
  and filter reflect the new status immediately, reconciled against the
  server in the background, rolled back on error.
*/
export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation<Campaign, Error, UpdateCampaignInput, MutationContext>({
    mutationFn: updateCampaign,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: campaignsQueryKey });
      const previous = queryClient.getQueryData<Campaign[]>(campaignsQueryKey);

      queryClient.setQueryData<Campaign[]>(campaignsQueryKey, (current) =>
        current?.map((campaign) => (campaign.id === input.id ? { ...campaign, ...input } : campaign)),
      );

      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(campaignsQueryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: campaignsQueryKey });
    },
  });
}
