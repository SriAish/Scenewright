/** Builds a filesystem- and header-safe PDF filename from a campaign title. */
export function buildExportFilename(campaignTitle: string): string {
  const sanitized = campaignTitle
    .trim()
    .replace(/[^a-zA-Z0-9 _-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `${sanitized || "campaign"}.pdf`;
}
