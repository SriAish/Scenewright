"use client";

import { useMutation } from "@tanstack/react-query";

export interface ExportCampaignPdfInput {
  campaignId: string;
}

export interface ExportCampaignPdfResult {
  blob: Blob;
  filename: string;
  /** Unknown rich-text node types the exporter fell back to plain text for, per node. Empty when there were none. */
  warnings: string[];
}

function parseFilename(disposition: string | null): string {
  const match = disposition?.match(/filename="([^"]+)"/);
  return match?.[1] ?? "campaign.pdf";
}

function parseWarnings(header: string | null): string[] {
  if (!header) return [];
  try {
    const parsed = JSON.parse(header);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

async function exportCampaignPdf({ campaignId }: ExportCampaignPdfInput): Promise<ExportCampaignPdfResult> {
  const response = await fetch(`/api/campaigns/${campaignId}/export`, { method: "POST" });
  if (!response.ok) {
    throw new Error("Failed to export campaign");
  }
  const filename = parseFilename(response.headers.get("Content-Disposition"));
  const warnings = parseWarnings(response.headers.get("X-Export-Warnings"));
  const blob = await response.blob();
  return { blob, filename, warnings };
}

/** Renders and downloads the campaign PDF, screen 15's Export action. */
export function useExportCampaignPdf() {
  return useMutation({
    mutationFn: exportCampaignPdf,
  });
}
