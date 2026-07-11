"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BackIcon,
  Button,
  EntityType,
  IconButton,
  MapIcon,
  MentionChip,
  ModalChassis,
  MoreIcon,
} from "@/components/ui";
import { campaignScope, EntityScope, ItemData, libraryScope, MonsterData, NpcData } from "@/hooks/useEntities";
import { useDeleteEntity } from "@/hooks/useDeleteEntity";
import { useUpdateEntity } from "@/hooks/useUpdateEntity";
import { useBackstoryReferences } from "@/hooks/useBackstoryReferences";
import { useSaveToLibrary } from "@/hooks/useSaveToLibrary";
import { BackstoryReferenceConfirmModal } from "./BackstoryReferenceConfirmModal";
import { EntityPortrait } from "./EntityPortrait";
import { ItemFields } from "./ItemFields";
import { MonsterFields } from "./MonsterFields";
import { NpcFields } from "./NpcFields";

const TAB_LABEL: Record<EntityType, string> = { npc: "Characters", monster: "Monsters", item: "Items" };
const TYPE_CHIP_LABEL: Record<EntityType, string> = { npc: "Character", monster: "Monster", item: "Item" };

export interface AppearsInRow {
  label: string;
  href: string;
}

/** Which scope this detail page is rendering against: one campaign, or the library. */
export type EntityDetailScope =
  | { type: "campaign"; campaignId: string; campaignTitle: string }
  | { type: "library" };

export interface EntityDetailProps {
  scope: EntityDetailScope;
  entity: {
    id: string;
    type: EntityType;
    name: string;
    summary: string;
    data: NpcData | MonsterData | ItemData;
    backstoryJson: unknown;
  };
  /** Name of the srd_entries row this entity was forked from, or null when it wasn't SRD-derived (never set on a fork copy). */
  srdSourceName?: string | null;
  /** "Library" or a campaign title, when this entity is a forked copy; root-derived per src/lib/registry. */
  copiedFrom?: string | null;
  /** Campaign-scoped entities only: whether no library entity shares this entity's lineage yet. */
  canSaveToLibrary?: boolean;
  /** Scenes and backstories mentioning this entity, from the mentions reverse-lookup. */
  appearsIn?: AppearsInRow[];
}

function toEntityScope(scope: EntityDetailScope): EntityScope {
  return scope.type === "campaign" ? campaignScope(scope.campaignId) : libraryScope;
}

/**
 * Entity detail / edit, screen 9: two-column layout, edit-in-place (no
 * Save button or Edit toggle, per the design frame). Reused against
 * both campaign and library scope (screen 13's library entity detail
 * is this same component). No generation, no import, no finder in this
 * build step.
 */
export function EntityDetail({ scope, entity, srdSourceName, copiedFrom, canSaveToLibrary = false, appearsIn = [] }: EntityDetailProps) {
  const router = useRouter();
  const entityScope = toEntityScope(scope);
  const updateEntity = useUpdateEntity(entityScope, entity.type);
  const deleteEntity = useDeleteEntity(entityScope, entity.type);
  const backstoryReferences = useBackstoryReferences();
  const saveToLibrary = useSaveToLibrary(entity.type);

  const [name, setName] = useState(entity.name);
  const [isEditingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(entity.name);

  const [summary, setSummary] = useState(entity.summary);
  const [summaryDraft, setSummaryDraft] = useState(entity.summary);

  const [data, setData] = useState<Record<string, unknown>>(entity.data as Record<string, unknown>);

  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const [savedToLibrary, setSavedToLibrary] = useState(false);
  const [pendingSave, setPendingSave] = useState<{ names: string[] } | null>(null);

  useEffect(() => {
    if (!overflowOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (overflowRef.current && !overflowRef.current.contains(event.target as Node)) {
        setOverflowOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [overflowOpen]);

  function commitName() {
    setEditingName(false);
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === name) {
      setNameDraft(name);
      return;
    }
    const previous = name;
    setName(trimmed);
    updateEntity.mutate({ id: entity.id, name: trimmed }, { onError: () => setName(previous) });
  }

  function commitSummary() {
    if (summaryDraft === summary) return;
    const previous = summary;
    setSummary(summaryDraft);
    updateEntity.mutate({ id: entity.id, summary: summaryDraft }, { onError: () => setSummary(previous) });
  }

  function commitData(next: NpcData | MonsterData | ItemData) {
    setData(next as unknown as Record<string, unknown>);
    updateEntity.mutate({ id: entity.id, data: next });
  }

  function handleDelete() {
    deleteEntity.mutate(entity.id);
    router.push(scope.type === "campaign" ? `/campaigns/${scope.campaignId}` : "/library");
  }

  async function handleSaveToLibraryClick() {
    if (scope.type !== "campaign") return;
    const result = await backstoryReferences.mutateAsync({ entityId: entity.id, target: "library" });
    if (result.names.length === 0) {
      await saveToLibrary.mutateAsync({ campaignId: scope.campaignId, entityId: entity.id, mentionStrategy: "flatten" });
      setSavedToLibrary(true);
      return;
    }
    setPendingSave({ names: result.names });
  }

  async function handleConfirmSave(mentionStrategy: "flatten" | "copyReferenced") {
    if (scope.type !== "campaign") return;
    await saveToLibrary.mutateAsync({ campaignId: scope.campaignId, entityId: entity.id, mentionStrategy });
    setPendingSave(null);
    setSavedToLibrary(true);
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-panel">
      <div className="flex items-center gap-md px-xl py-base border-b border-border-default bg-surface-card-solid sticky top-0 z-20">
        <Link
          href={scope.type === "campaign" ? `/campaigns/${scope.campaignId}` : "/library"}
          className="inline-flex items-center gap-sm text-ui font-medium text-text-secondary hover:bg-surface-panel rounded-sm px-sm py-[6px]"
        >
          <BackIcon />
          {scope.type === "campaign" ? scope.campaignTitle : "Library"}
        </Link>
        <span className="text-border-default">|</span>
        <span className="text-nav text-text-secondary">{TAB_LABEL[entity.type]}</span>
        <div className="flex-1" />
        <MentionChip type={entity.type}>{TYPE_CHIP_LABEL[entity.type]}</MentionChip>
      </div>

      <div className="flex gap-xl px-xl py-xl items-start">
        <div className="flex-1 min-w-0 flex flex-col gap-xl">
          <div className="flex gap-base items-start">
            <EntityPortrait type={entity.type} />
            <div className="min-w-0 pt-[2px] flex-1">
              {isEditingName ? (
                <input
                  autoFocus
                  value={nameDraft}
                  onChange={(event) => setNameDraft(event.target.value)}
                  onBlur={commitName}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                    if (event.key === "Escape") {
                      setNameDraft(name);
                      setEditingName(false);
                    }
                  }}
                  className="font-display italic font-semibold text-[25px] text-text-primary border border-border-soft bg-surface-card rounded-sm px-sm py-[2px] outline-none w-full"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setNameDraft(name);
                    setEditingName(true);
                  }}
                  className="font-display italic font-semibold text-[25px] text-text-primary border border-transparent hover:border-border-soft hover:bg-surface-card rounded-sm px-sm py-[2px] -ml-sm cursor-text text-left"
                >
                  {name}
                </button>
              )}
              <textarea
                value={summaryDraft}
                onChange={(event) => setSummaryDraft(event.target.value)}
                onBlur={commitSummary}
                rows={2}
                placeholder="Two-line summary, used in pickers"
                className="block w-full max-w-[480px] mt-[4px] text-ui text-text-secondary bg-transparent border border-transparent hover:border-border-soft focus:border-border-soft focus:bg-surface-card rounded-sm px-sm py-[2px] outline-none resize-none"
              />
            </div>
          </div>

          {entity.type === "npc" && (
            <NpcFields
              data={data as NpcData}
              onCommit={(next) => commitData(next)}
              scope={entityScope}
              backstoryJson={entity.backstoryJson}
              onBackstorySave={(doc) => updateEntity.mutate({ id: entity.id, backstoryJson: doc })}
            />
          )}
          {entity.type === "monster" && <MonsterFields data={data as MonsterData} onCommit={(next) => commitData(next)} />}
          {entity.type === "item" && <ItemFields data={data as ItemData} onCommit={(next) => commitData(next)} />}
        </div>

        <div className="w-[272px] shrink-0 flex flex-col gap-base sticky top-[90px]">
          <span className="block text-label font-semibold uppercase tracking-wider text-text-label">
            Appears in
          </span>
          <div className="bg-surface-card border border-border-soft rounded-lg p-md flex flex-col gap-sm">
            {appearsIn.length === 0 ? (
              <p className="text-ui text-text-secondary leading-[1.5]">Nothing mentions this yet.</p>
            ) : (
              appearsIn.map((row) => (
                <Link
                  key={`${row.href}-${row.label}`}
                  href={row.href}
                  className="text-ui text-link hover:text-link-hover leading-[1.4]"
                >
                  {row.label}
                </Link>
              ))
            )}
          </div>

          {copiedFrom && (
            <div className="flex items-center gap-sm text-micro text-text-placeholder">
              <MapIcon size={12} />
              Copied from {copiedFrom}
            </div>
          )}
          {!copiedFrom && srdSourceName && (
            <div className="flex items-center gap-sm text-micro text-text-placeholder">
              <MapIcon size={12} />
              Based on SRD: {srdSourceName}
            </div>
          )}

          {scope.type === "campaign" && (canSaveToLibrary || savedToLibrary) && (
            <div>
              {savedToLibrary ? (
                <span className="text-micro text-text-secondary">Saved to library.</span>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSaveToLibraryClick}
                  disabled={backstoryReferences.isPending || saveToLibrary.isPending}
                >
                  {backstoryReferences.isPending || saveToLibrary.isPending ? "Working..." : "Save to library"}
                </Button>
              )}
            </div>
          )}

          <div className="flex items-center gap-sm relative" ref={overflowRef}>
            <div className="flex-1" />
            <IconButton label="Entity actions" onClick={() => setOverflowOpen((open) => !open)}>
              <MoreIcon />
            </IconButton>
            {overflowOpen && (
              <div className="absolute right-0 top-[34px] z-30 w-[200px] bg-surface-card-solid border border-border-default rounded-md shadow-popover p-[6px] flex flex-col gap-[2px]">
                <button
                  type="button"
                  onClick={() => {
                    setOverflowOpen(false);
                    setDeleteModalOpen(true);
                  }}
                  className="text-left text-ui font-medium px-sm py-[8px] rounded-sm text-danger-text hover:bg-danger-bg-hover cursor-pointer"
                >
                  Delete
                </button>
                <div className="text-micro text-text-placeholder px-sm pb-[6px]">
                  Mentions will show as inactive chips.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {deleteModalOpen && (
        <ModalChassis
          title={`Delete ${TYPE_CHIP_LABEL[entity.type].toLowerCase()}`}
          size="small"
          onClose={() => setDeleteModalOpen(false)}
          footer={
            <div className="flex justify-end gap-sm">
              <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </div>
          }
        >
          <p className="text-ui text-text-secondary leading-[1.5]">
            Delete &ldquo;{name}&rdquo;? Mentions of it will show as inactive chips. This can be
            recovered from the database but not from the app.
          </p>
        </ModalChassis>
      )}

      {pendingSave && (
        <BackstoryReferenceConfirmModal
          entityName={name}
          names={pendingSave.names}
          onBack={() => setPendingSave(null)}
          onClose={() => setPendingSave(null)}
          onConfirm={handleConfirmSave}
          isSubmitting={saveToLibrary.isPending}
          submitLabel="Save"
        />
      )}
    </div>
  );
}
