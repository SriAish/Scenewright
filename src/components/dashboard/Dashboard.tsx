"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, EmptyState, ModalChassis, PlusIcon } from "@/components/ui";
import { Campaign, useCampaigns } from "@/hooks/useCampaigns";
import { useDeleteCampaign } from "@/hooks/useDeleteCampaign";
import { useUpdateCampaign } from "@/hooks/useUpdateCampaign";
import { CampaignCard } from "./CampaignCard";
import { NewCampaignModal } from "./NewCampaignModal";
import { FilterValue, StatusFilter } from "./StatusFilter";
import { TopBar } from "./TopBar";

export interface DashboardProps {
  userEmail: string;
  signOutAction: () => Promise<void>;
}

/** Campaign dashboard, screen 2. */
export function Dashboard({ userEmail, signOutAction }: DashboardProps) {
  const router = useRouter();
  const { data: campaigns, isLoading } = useCampaigns();
  const updateCampaign = useUpdateCampaign();
  const deleteCampaign = useDeleteCampaign();

  const [filter, setFilter] = useState<FilterValue>("all");
  const [isNewCampaignOpen, setNewCampaignOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Campaign | null>(null);

  const filteredCampaigns = useMemo(() => {
    if (!campaigns) return [];
    if (filter === "all") return campaigns;
    return campaigns.filter((campaign) => campaign.status === filter);
  }, [campaigns, filter]);

  const hasNoCampaigns = !isLoading && (campaigns?.length ?? 0) === 0;

  return (
    <div className="min-h-screen flex flex-col bg-surface-canvas">
      <TopBar userEmail={userEmail} signOutAction={signOutAction} />

      {hasNoCampaigns ? (
        <div className="flex-1 flex items-center justify-center px-lg">
          <EmptyState
            heading="No campaigns yet"
            copy="Plan campaigns scene by scene."
            action={
              <div className="flex items-center gap-sm">
                <Button variant="primary" onClick={() => setNewCampaignOpen(true)}>
                  Start blank campaign
                </Button>
                <Button variant="secondary" onClick={() => router.push("/directory")}>
                  Browse adventure directory
                </Button>
              </div>
            }
          />
        </div>
      ) : (
        <div className="flex-1">
          <div className="flex items-center gap-base px-xl pt-xl pb-[4px]">
            <h1 className="font-display italic font-semibold text-[22px] text-text-primary whitespace-nowrap">
              Your campaigns
            </h1>
            <div className="flex-1" />
            <StatusFilter value={filter} onChange={setFilter} />
            <Button variant="primary" onClick={() => setNewCampaignOpen(true)}>
              <PlusIcon />
              New campaign
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-lg px-xl pt-lg pb-[40px]">
            {isLoading ? (
              <p className="text-ui text-text-secondary col-span-full">Loading campaigns...</p>
            ) : (
              filteredCampaigns.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  onChangeStatus={(id, status) => updateCampaign.mutate({ id, status })}
                  onRequestDelete={setPendingDelete}
                />
              ))
            )}
          </div>
        </div>
      )}

      {isNewCampaignOpen && <NewCampaignModal onClose={() => setNewCampaignOpen(false)} />}

      {pendingDelete && (
        <ModalChassis
          title="Delete campaign"
          size="small"
          onClose={() => setPendingDelete(null)}
          footer={
            <div className="flex justify-end gap-sm">
              <Button variant="secondary" onClick={() => setPendingDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  deleteCampaign.mutate(pendingDelete.id);
                  setPendingDelete(null);
                }}
              >
                Delete campaign
              </Button>
            </div>
          }
        >
          <p className="text-ui text-text-secondary leading-[1.5]">
            Delete &ldquo;{pendingDelete.title}&rdquo;? The campaign will disappear from your
            dashboard, but it stays recoverable and is not permanently removed.
          </p>
        </ModalChassis>
      )}
    </div>
  );
}
