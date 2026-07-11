"use client";

import { useState } from "react";
import { Button, ChevronDownIcon, ModalChassis } from "@/components/ui";
import { useExportCampaignPdf } from "@/hooks/useExportCampaignPdf";

export interface ExportPdfModalProps {
  campaignId: string;
  onClose: () => void;
}

const INCLUDED_ITEMS = [
  "Storyline",
  "Scenes, in reading order",
  "Maps",
  "Entity lists",
  "Entity appendix",
  "Notes",
];

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * PDF export modal, screen 15: not sourced from a design frame (per
 * build-brief.md, this screen is "to be derived from the design
 * system"), so it's built from ModalChassis and the existing type/
 * spacing tokens rather than a specific canvas. Fixed checklist, no
 * per-section toggles, per features-and-decisions.md's Export section.
 */
export function ExportPdfModal({ campaignId, onClose }: ExportPdfModalProps) {
  const exportPdf = useExportCampaignPdf();
  const [downloaded, setDownloaded] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [warningsExpanded, setWarningsExpanded] = useState(false);

  async function handleExport() {
    setDownloaded(false);
    setWarnings([]);
    setWarningsExpanded(false);
    const { blob, filename, warnings: nextWarnings } = await exportPdf.mutateAsync({ campaignId });
    downloadBlob(blob, filename);
    setDownloaded(true);
    setWarnings(nextWarnings);
  }

  return (
    <ModalChassis
      title="Export PDF"
      size="small"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-sm">
          <Button variant="secondary" onClick={onClose}>
            {downloaded ? "Done" : "Cancel"}
          </Button>
          <Button variant="primary" onClick={handleExport} disabled={exportPdf.isPending}>
            {exportPdf.isPending ? "Exporting..." : "Export"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-base">
        <div className="flex flex-col gap-sm">
          <span className="text-label font-semibold uppercase tracking-wider text-text-label">
            Included in the PDF
          </span>
          <ul className="flex flex-col gap-[6px]">
            {INCLUDED_ITEMS.map((item) => (
              <li key={item} className="text-ui text-text-primary leading-[1.4] pl-md relative before:content-['•'] before:absolute before:left-0 before:text-text-placeholder">
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-ui text-text-secondary leading-[1.5]">
          Output is black and white; map and entity images are converted to grayscale.
        </p>
        {exportPdf.isError && (
          <p role="alert" className="text-ui text-danger-text bg-danger-bg-hover rounded-sm px-sm py-sm">
            {exportPdf.error.message}
          </p>
        )}
        {downloaded && !exportPdf.isPending && !exportPdf.isError && (
          warnings.length === 0 ? (
            <p className="text-ui text-text-secondary">Downloaded.</p>
          ) : (
            <div>
              <p className="text-ui text-text-secondary">Downloaded.</p>
              <button
                type="button"
                onClick={() => setWarningsExpanded((open) => !open)}
                className="w-full flex items-center justify-between cursor-pointer mt-sm"
              >
                <span className="text-micro text-text-secondary">
                  Exported with {warnings.length} note{warnings.length === 1 ? "" : "s"}
                </span>
                <ChevronDownIcon
                  className={`text-text-placeholder transition-transform duration-150 ${warningsExpanded ? "rotate-180" : "-rotate-90"}`}
                />
              </button>
              {warningsExpanded && (
                <ul className="flex flex-col gap-[4px] mt-sm">
                  {warnings.map((warning, index) => (
                    <li key={index} className="text-micro text-text-secondary leading-[1.4] pl-md relative before:content-['•'] before:absolute before:left-0 before:text-text-placeholder">
                      {warning}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        )}
      </div>
    </ModalChassis>
  );
}
