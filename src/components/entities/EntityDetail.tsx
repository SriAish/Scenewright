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
import { ItemData, MonsterData, NpcData } from "@/hooks/useEntities";
import { useDeleteEntity } from "@/hooks/useDeleteEntity";
import { useUpdateEntity } from "@/hooks/useUpdateEntity";
import { docToLines, isPlainTextDoc, linesToDoc } from "@/lib/tiptapPlainText";
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

export interface EntityDetailProps {
  campaignId: string;
  campaignTitle: string;
  entity: {
    id: string;
    type: EntityType;
    name: string;
    summary: string;
    data: NpcData | MonsterData | ItemData;
    backstoryJson: unknown;
  };
  /** Name of the srd_entries row this entity was forked from, or null when it wasn't SRD-derived. */
  srdSourceName?: string | null;
  /** Scenes and backstories mentioning this entity, from the mentions reverse-lookup. */
  appearsIn?: AppearsInRow[];
}

interface BackstoryState {
  editable: boolean;
  text: string;
}

function initBackstory(doc: unknown): BackstoryState {
  const editable = isPlainTextDoc(doc);
  return { editable, text: editable ? docToLines(doc).join("\n") : "" };
}

/**
 * Entity detail / edit, screen 9: two-column layout, edit-in-place (no
 * Save button or Edit toggle, per the design frame). No generation, no
 * import, no finder, no library, no mentions, no save-to-library in
 * this build step.
 */
export function EntityDetail({ campaignId, campaignTitle, entity, srdSourceName, appearsIn = [] }: EntityDetailProps) {
  const router = useRouter();
  const updateEntity = useUpdateEntity(campaignId, entity.type);
  const deleteEntity = useDeleteEntity(campaignId, entity.type);

  const [name, setName] = useState(entity.name);
  const [isEditingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(entity.name);

  const [summary, setSummary] = useState(entity.summary);
  const [summaryDraft, setSummaryDraft] = useState(entity.summary);

  const [data, setData] = useState<Record<string, unknown>>(entity.data as Record<string, unknown>);
  const [backstory, setBackstory] = useState<BackstoryState>(() => initBackstory(entity.backstoryJson));

  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

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

  function commitBackstory() {
    updateEntity.mutate({ id: entity.id, backstoryJson: linesToDoc(backstory.text.split("\n")) });
  }

  function handleDelete() {
    deleteEntity.mutate(entity.id);
    router.push(`/campaigns/${campaignId}`);
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-panel">
      <div className="flex items-center gap-md px-xl py-base border-b border-border-default bg-surface-card-solid sticky top-0 z-20">
        <Link
          href={`/campaigns/${campaignId}`}
          className="inline-flex items-center gap-sm text-ui font-medium text-text-secondary hover:bg-surface-panel rounded-sm px-sm py-[6px]"
        >
          <BackIcon />
          {campaignTitle}
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
              backstoryText={backstory.text}
              backstoryEditable={backstory.editable}
              onBackstoryChange={(text) => setBackstory((prev) => ({ ...prev, text }))}
              onBackstoryBlur={commitBackstory}
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

          {srdSourceName && (
            <div className="flex items-center gap-sm text-micro text-text-placeholder">
              <MapIcon size={12} />
              Based on SRD: {srdSourceName}
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
    </div>
  );
}
