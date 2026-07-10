"use client";

import { useQuery } from "@tanstack/react-query";

export type CampaignStatus = "draft" | "running" | "completed";

export interface Campaign {
  id: string;
  title: string;
  premise: string | null;
  status: CampaignStatus;
  sceneCount: number;
  updatedAt: string;
}

export const campaignsQueryKey = ["campaigns"] as const;

async function fetchCampaigns(): Promise<Campaign[]> {
  const response = await fetch("/api/campaigns");
  if (!response.ok) {
    throw new Error("Failed to load campaigns");
  }
  return response.json();
}

export function useCampaigns() {
  return useQuery({
    queryKey: campaignsQueryKey,
    queryFn: fetchCampaigns,
  });
}
