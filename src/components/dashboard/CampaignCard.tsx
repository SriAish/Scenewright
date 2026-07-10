"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconButton, MoreIcon, StatusPill } from "@/components/ui";
import { Campaign, CampaignStatus } from "@/hooks/useCampaigns";
import { formatRelativeTime } from "./relativeTime";

const STATUS_LABEL: Record<CampaignStatus, string> = {
  draft: "Draft",
  running: "Running",
  completed: "Completed",
};
const STATUS_OPTIONS: CampaignStatus[] = ["draft", "running", "completed"];

export interface CampaignCardProps {
  campaign: Campaign;
  onChangeStatus: (id: string, status: CampaignStatus) => void;
  onRequestDelete: (campaign: Campaign) => void;
}

/*
  Card overflow affordance (status change, delete): the dashboard frame
  itself does not depict a hover/menu state on the cards, so this reuses
  the icon-button-plus-dropdown pattern the design system already uses
  elsewhere (campaign header overflow, entity detail rail) rather than
  inventing a new one.
*/
export function CampaignCard({ campaign, onChangeStatus, onRequestDelete }: CampaignCardProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  return (
    <div
      onClick={() => router.push(`/campaigns/${campaign.id}`)}
      className="relative flex flex-col gap-md bg-surface-card-solid border border-border-default rounded-md shadow-card p-lg cursor-pointer transition-shadow duration-150 hover:shadow-popover"
    >
      <div className="flex items-start justify-between gap-sm">
        <div className="font-display font-semibold text-[17px] text-text-primary truncate">
          {campaign.title}
        </div>
        <div className="flex items-center gap-[4px] shrink-0">
          <StatusPill family="campaign" status={campaign.status} />
          <div className="relative" ref={menuRef}>
            <IconButton
              label="Campaign actions"
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen((open) => !open);
              }}
            >
              <MoreIcon />
            </IconButton>
            {menuOpen && (
              <div
                onClick={(event) => event.stopPropagation()}
                className="absolute right-0 top-[30px] z-30 w-[190px] bg-surface-card-solid border border-border-default rounded-md shadow-popover p-[6px] flex flex-col gap-[2px]"
              >
                <div className="text-micro font-semibold uppercase tracking-wider text-text-label px-sm pt-sm pb-[2px]">
                  Change status
                </div>
                {STATUS_OPTIONS.filter((status) => status !== campaign.status).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      onChangeStatus(campaign.id, status);
                      setMenuOpen(false);
                    }}
                    className="text-left text-ui font-medium px-sm py-[8px] rounded-sm text-text-button hover:bg-surface-panel cursor-pointer"
                  >
                    Mark as {STATUS_LABEL[status]}
                  </button>
                ))}
                <div className="h-px bg-border-default my-[4px]" />
                <button
                  type="button"
                  onClick={() => {
                    onRequestDelete(campaign);
                    setMenuOpen(false);
                  }}
                  className="text-left text-ui font-medium px-sm py-[8px] rounded-sm text-danger-text hover:bg-danger-bg-hover cursor-pointer"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {campaign.premise && (
        <div className="text-ui text-text-secondary leading-[1.55] line-clamp-2">{campaign.premise}</div>
      )}

      <div className="flex items-center gap-sm text-micro text-text-secondary mt-[2px]">
        <span>{campaign.sceneCount} {campaign.sceneCount === 1 ? "scene" : "scenes"}</span>
        <span className="w-[3px] h-[3px] rounded-pill bg-border-default" />
        <span>Edited {formatRelativeTime(campaign.updatedAt)}</span>
      </div>
    </div>
  );
}
