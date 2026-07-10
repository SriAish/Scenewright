"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Campaign, campaignsQueryKey } from "./useCampaigns";

export interface CreateCampaignInput {
  title: string;
  premise?: string | null;
}

async function createCampaign(input: CreateCampaignInput): Promise<Campaign> {
  const response = await fetch("/api/campaigns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error("Failed to create campaign");
  }
  return response.json();
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignsQueryKey });
    },
  });
}
