"use client";

import { useMutation } from "@tanstack/react-query";

export interface ExportCampaignPdfInput {
  campaignId: string;
}

export interface ExportCampaignPdfResult {
  blob: Blob;
  filename: string;
}

function parseFilename(disposition: string | null): string {
  const match = disposition?.match(/filename="([^"]+)"/);
  return match?.[1] ?? "campaign.pdf";
}

async function exportCampaignPdf({ campaignId }: ExportCampaignPdfInput): Promise<ExportCampaignPdfResult> {
  const response = await fetch(`/api/campaigns/${campaignId}/export`, { method: "POST" });
  if (!response.ok) {
    throw new Error("Failed to export campaign");
  }
  const filename = parseFilename(response.headers.get("Content-Disposition"));
  const blob = await response.blob();
  return { blob, filename };
}

/** Renders and downloads the campaign PDF, screen 15's Export action. */
export function useExportCampaignPdf() {
  return useMutation({
    mutationFn: exportCampaignPdf,
  });
}
