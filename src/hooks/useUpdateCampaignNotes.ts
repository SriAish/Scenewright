"use client";

import { useMutation } from "@tanstack/react-query";

async function updateCampaignNotes(campaignId: string, notesJson: unknown): Promise<void> {
  const response = await fetch(`/api/campaigns/${campaignId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notesJson }),
  });
  if (!response.ok) {
    throw new Error("Failed to save campaign notes");
  }
}

/*
  Separate from useUpdateCampaign: notes autosave fires on every debounced
  edit and has no reason to touch the dashboard's campaigns list cache
  (no notesJson field there), so this skips the optimistic list update
  and invalidation that title/status edits go through.
*/
export function useUpdateCampaignNotes(campaignId: string) {
  return useMutation({
    mutationFn: (notesJson: unknown) => updateCampaignNotes(campaignId, notesJson),
  });
}
