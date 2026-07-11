"use client";

import { useState } from "react";
import { Button, ChevronDownIcon, EntityIcon, EntityType, ModalChassis, RadioOption, Toggle, entityColorClasses } from "@/components/ui";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useRegistrySearch } from "@/hooks/useRegistrySearch";
import { useBackstoryReferences } from "@/hooks/useBackstoryReferences";
import { useImportEntity } from "@/hooks/useImportEntity";
import { BackstoryReferenceConfirmModal } from "./BackstoryReferenceConfirmModal";

export interface ImportModalProps {
  campaignId: string;
  type: EntityType;
  onClose: () => void;
}

/**
 * Screen 12: search across all the GM's campaigns and the library,
 * grouped by lineage. Excludes this campaign's own entities ("import
 * from my OTHER campaigns"). Shows every group by default (no query
 * required, unlike the SRD finder) since this is a browse of the GM's
 * own entities, not a large third-party corpus.
 */
export function ImportModal({ campaignId, type, onClose }: ImportModalProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);
  const [includeDeletedCampaigns, setIncludeDeletedCampaigns] = useState(false);
  const [expandedRootId, setExpandedRootId] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<{ variantId: string; names: string[] } | null>(null);

  const { data: groups, isFetching } = useRegistrySearch({
    type,
    query: debouncedSearch,
    includeDeletedCampaigns,
    excludeCampaignId: campaignId,
  });

  const backstoryReferences = useBackstoryReferences();
  const importEntity = useImportEntity(campaignId, type);

  const selectedVariant = groups?.flatMap((group) => group.variants).find((variant) => variant.id === selectedVariantId) ?? null;

  async function handleImportClick() {
    if (!selectedVariantId) return;
    const result = await backstoryReferences.mutateAsync({ entityId: selectedVariantId, target: campaignId });
    if (result.names.length === 0) {
      await importEntity.mutateAsync({ variantId: selectedVariantId, targetCampaignId: campaignId, mentionStrategy: "flatten" });
      onClose();
      return;
    }
    setPendingImport({ variantId: selectedVariantId, names: result.names });
  }

  async function handleConfirm(mentionStrategy: "flatten" | "copyReferenced") {
    if (!pendingImport) return;
    await importEntity.mutateAsync({ variantId: pendingImport.variantId, targetCampaignId: campaignId, mentionStrategy });
    onClose();
  }

  if (pendingImport && selectedVariant) {
    return (
      <BackstoryReferenceConfirmModal
        entityName={selectedVariant.name}
        names={pendingImport.names}
        onBack={() => setPendingImport(null)}
        onClose={onClose}
        onConfirm={handleConfirm}
        isSubmitting={importEntity.isPending}
        submitLabel="Import"
      />
    );
  }

  return (
    <ModalChassis
      title="Import from my campaigns"
      size="small"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between w-full gap-md">
          <div className="flex items-center gap-sm">
            <Toggle
              checked={includeDeletedCampaigns}
              onChange={setIncludeDeletedCampaigns}
              label="Show variants from deleted campaigns"
            />
            <span className="text-micro text-text-secondary">Show variants from deleted campaigns</span>
          </div>
          <Button
            variant="primary"
            disabled={!selectedVariantId || backstoryReferences.isPending || importEntity.isPending}
            onClick={handleImportClick}
          >
            {backstoryReferences.isPending || importEntity.isPending ? "Working..." : "Import copy"}
          </Button>
        </div>
      }
    >
      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search..."
        className="w-full text-content text-text-primary bg-surface-card border border-border-soft rounded-sm px-[14px] py-[9px] outline-none placeholder:text-text-placeholder"
      />

      <div className="flex flex-col gap-sm">
        {isFetching && !groups ? (
          <p className="text-ui text-text-secondary text-center py-lg">Searching...</p>
        ) : !groups || groups.length === 0 ? (
          <p className="text-ui text-text-secondary text-center py-lg">No matches.</p>
        ) : (
          groups.map((group) => (
            <div key={group.effectiveRootId} className="border border-border-soft rounded-md overflow-hidden">
              <button
                type="button"
                onClick={() =>
                  setExpandedRootId((current) => (current === group.effectiveRootId ? null : group.effectiveRootId))
                }
                className="w-full flex items-center gap-sm px-md py-sm bg-surface-card hover:bg-surface-panel cursor-pointer"
              >
                <EntityIcon type={group.type} size={14} className={entityColorClasses[group.type].text} />
                <span className="text-ui font-semibold text-text-primary truncate">{group.headerName}</span>
                <span className="text-micro text-text-secondary shrink-0">
                  {group.versionCount} version{group.versionCount === 1 ? "" : "s"}
                </span>
                <div className="flex-1" />
                <ChevronDownIcon
                  className={`text-text-placeholder transition-transform duration-150 ${
                    expandedRootId === group.effectiveRootId ? "rotate-180" : "-rotate-90"
                  }`}
                />
              </button>
              {expandedRootId === group.effectiveRootId && (
                <div className="flex flex-col gap-md px-md py-sm border-t border-border-soft">
                  {group.variants.map((variant) => (
                    <RadioOption
                      key={variant.id}
                      checked={selectedVariantId === variant.id}
                      onSelect={() => setSelectedVariantId(variant.id)}
                      label={variant.name}
                      description={`${variant.sourceLabel}${variant.isDeletedCampaign ? " (deleted)" : ""}: ${variant.summary || "No summary yet."}`}
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </ModalChassis>
  );
}
