"use client";

import { useEffect, useRef, useState } from "react";
import { Button, ChevronDownIcon, IconButton, MoreIcon, StatusPill } from "@/components/ui";
import { CampaignStatus } from "@/hooks/useCampaigns";

const STATUS_LABEL: Record<CampaignStatus, string> = {
  draft: "Draft",
  running: "Running",
  completed: "Completed",
};
const STATUS_OPTIONS: CampaignStatus[] = ["draft", "running", "completed"];

export interface CampaignHeaderProps {
  title: string;
  status: CampaignStatus;
  onTitleChange: (title: string) => void;
  onStatusChange: (status: CampaignStatus) => void;
  onRequestDelete: () => void;
}

/**
 * Campaign shell header, screen 5: inline-editable title, a status
 * pill that opens a change-status menu (matches the frame's chevron
 * affordance), a disabled Export PDF button, and an overflow menu.
 */
export function CampaignHeader({
  title,
  status,
  onTitleChange,
  onStatusChange,
  onRequestDelete,
}: CampaignHeaderProps) {
  const [isEditingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title);

  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!statusMenuOpen && !overflowOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (statusMenuOpen && statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
        setStatusMenuOpen(false);
      }
      if (overflowOpen && overflowRef.current && !overflowRef.current.contains(event.target as Node)) {
        setOverflowOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [statusMenuOpen, overflowOpen]);

  function commitTitle() {
    setEditingTitle(false);
    const trimmed = titleDraft.trim();
    if (!trimmed || trimmed === title) {
      setTitleDraft(title);
      return;
    }
    onTitleChange(trimmed);
  }

  return (
    <div className="flex items-center gap-md px-xl py-base border-b border-border-default bg-surface-card-solid sticky top-0 z-20">
      {isEditingTitle ? (
        <input
          autoFocus
          value={titleDraft}
          onChange={(event) => setTitleDraft(event.target.value)}
          onBlur={commitTitle}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") {
              setTitleDraft(title);
              setEditingTitle(false);
            }
          }}
          className="font-display italic font-semibold text-display text-text-primary border border-border-soft bg-surface-card rounded-sm px-sm py-[4px] outline-none min-w-[220px]"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setTitleDraft(title);
            setEditingTitle(true);
          }}
          className="font-display italic font-semibold text-display text-text-primary border border-transparent hover:border-border-soft hover:bg-surface-card rounded-sm px-sm py-[4px] cursor-text whitespace-nowrap"
        >
          {title}
        </button>
      )}

      <div className="relative" ref={statusMenuRef}>
        <button
          type="button"
          onClick={() => setStatusMenuOpen((open) => !open)}
          className="inline-flex items-center gap-[2px] cursor-pointer"
        >
          <StatusPill family="campaign" status={status} />
          <ChevronDownIcon className="text-text-secondary" />
        </button>
        {statusMenuOpen && (
          <div className="absolute left-0 top-[36px] z-30 w-[180px] bg-surface-card-solid border border-border-default rounded-md shadow-popover p-[6px] flex flex-col gap-[2px]">
            {STATUS_OPTIONS.filter((option) => option !== status).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setStatusMenuOpen(false);
                  onStatusChange(option);
                }}
                className="text-left text-ui font-medium px-sm py-[8px] rounded-sm text-text-button hover:bg-surface-panel cursor-pointer"
              >
                Mark as {STATUS_LABEL[option]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* Temporary: PDF export is a later build step, per build-brief.md's build order. */}
      <Button variant="secondary" disabled title="Coming soon">
        Export PDF
      </Button>

      <div className="relative" ref={overflowRef}>
        <IconButton label="Campaign actions" onClick={() => setOverflowOpen((open) => !open)}>
          <MoreIcon />
        </IconButton>
        {overflowOpen && (
          <div className="absolute right-0 top-[34px] z-30 w-[180px] bg-surface-card-solid border border-border-default rounded-md shadow-popover p-[6px] flex flex-col gap-[2px]">
            <button
              type="button"
              onClick={() => {
                setOverflowOpen(false);
                onRequestDelete();
              }}
              className="text-left text-ui font-medium px-sm py-[8px] rounded-sm text-danger-text hover:bg-danger-bg-hover cursor-pointer"
            >
              Delete campaign
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
