"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, EntityType, ModalChassis } from "@/components/ui";
import { CampaignStatus } from "@/hooks/useCampaigns";
import { useDeleteCampaign } from "@/hooks/useDeleteCampaign";
import { useUpdateCampaign } from "@/hooks/useUpdateCampaign";
import { ScenesTab } from "@/components/scenes/ScenesTab";
import { EntityTab } from "@/components/entities/EntityTab";
import { CampaignHeader } from "./CampaignHeader";
import { CampaignTab, CampaignTabBar } from "./CampaignTabBar";
import { NotesTab } from "./NotesTab";

export interface CampaignShellProps {
  campaignId: string;
  initialTitle: string;
  initialStatus: CampaignStatus;
  initialNotesJson: unknown;
}

const ENTITY_TAB_TYPE: Record<"characters" | "monsters" | "items", EntityType> = {
  characters: "npc",
  monsters: "monster",
  items: "item",
};

/** Campaign view shell, screen 5: header, tab bar, and the active tab. Replaces the /campaigns/[id] placeholder. */
export function CampaignShell({ campaignId, initialTitle, initialStatus, initialNotesJson }: CampaignShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const updateCampaign = useUpdateCampaign();
  const deleteCampaign = useDeleteCampaign();

  const [title, setTitle] = useState(initialTitle);
  const [status, setStatus] = useState<CampaignStatus>(initialStatus);
  // Read once on mount so links like the entity detail "Appears in" panel
  // can deep-link into the Notes tab via ?tab=notes; the tab bar itself
  // doesn't sync back to the URL, matching the other tabs.
  const [tab, setTab] = useState<CampaignTab>(searchParams.get("tab") === "notes" ? "notes" : "scenes");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  function handleTitleChange(next: string) {
    const previous = title;
    setTitle(next);
    updateCampaign.mutate({ id: campaignId, title: next }, { onError: () => setTitle(previous) });
  }

  function handleStatusChange(next: CampaignStatus) {
    const previous = status;
    setStatus(next);
    updateCampaign.mutate({ id: campaignId, status: next }, { onError: () => setStatus(previous) });
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-canvas">
      <CampaignHeader
        title={title}
        status={status}
        onTitleChange={handleTitleChange}
        onStatusChange={handleStatusChange}
        onRequestDelete={() => setDeleteModalOpen(true)}
      />
      <CampaignTabBar active={tab} onChange={setTab} />

      {tab === "scenes" ? (
        <ScenesTab campaignId={campaignId} />
      ) : tab === "notes" ? (
        <NotesTab campaignId={campaignId} initialNotesJson={initialNotesJson} />
      ) : (
        <EntityTab campaignId={campaignId} type={ENTITY_TAB_TYPE[tab]} />
      )}

      {deleteModalOpen && (
        <ModalChassis
          title="Delete campaign"
          size="small"
          onClose={() => setDeleteModalOpen(false)}
          footer={
            <div className="flex justify-end gap-sm">
              <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  deleteCampaign.mutate(campaignId);
                  router.push("/");
                }}
              >
                Delete campaign
              </Button>
            </div>
          }
        >
          <p className="text-ui text-text-secondary leading-[1.5]">
            Delete &ldquo;{title}&rdquo;? The campaign will disappear from your dashboard, but it
            stays recoverable and is not permanently removed.
          </p>
        </ModalChassis>
      )}
    </div>
  );
}
