"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CloseIcon,
  EntityIcon,
  EntityType,
  MentionChip,
  MentionPopover,
  PlusIcon,
  entityColorClasses,
  entityTypeLabel,
} from "@/components/ui";
import { campaignScope, useEntities } from "@/hooks/useEntities";
import { useAddSceneEntity, useRemoveSceneEntity } from "@/hooks/useSceneEntities";
import type { SceneSidebarEntity } from "@/hooks/useScene";

export interface EntitySectionProps {
  campaignId: string;
  sceneId: string;
  type: EntityType;
  label: string;
  entities: SceneSidebarEntity[];
}

const SECTION_EMPTY_COPY: Record<EntityType, string> = {
  npc: "None yet — mention one in the text, or add manually.",
  monster: "None yet.",
  item: "None yet.",
};

/**
 * One sidebar section (Characters/Monsters/Items), screen 7: the union
 * of mention-derived and manual chips, an Add picker over campaign
 * entities of this type not already present. Auto chips render solid
 * with no remove control; manual chips render dashed with a hover
 * remove button, per the settled auto/manual chip styling.
 */
export function EntitySection({ campaignId, sceneId, type, label, entities }: EntitySectionProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const addEntity = useAddSceneEntity(campaignId, sceneId);
  const removeEntity = useRemoveSceneEntity(campaignId, sceneId);
  const { data: campaignEntities, refetch: refetchCampaignEntities } = useEntities(campaignScope(campaignId), type);

  const presentIds = useMemo(() => new Set(entities.map((entity) => entity.id)), [entities]);
  const pickerRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (campaignEntities ?? [])
      .filter((entity) => !presentIds.has(entity.id))
      .filter((entity) => !query || entity.name.toLowerCase().includes(query));
  }, [campaignEntities, presentIds, search]);

  useEffect(() => {
    if (!pickerOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [pickerOpen]);

  return (
    <div className="border border-border-soft bg-surface-card rounded-lg p-md flex flex-col gap-sm">
      <div className="flex items-center justify-between">
        <div className="text-ui font-semibold text-text-button">{label}</div>
        <div className="relative" ref={containerRef}>
          <button
            type="button"
            onClick={() => {
              setPickerOpen((open) => !open);
              // Refetch on open rather than trusting the cache: an entity
              // created elsewhere (another tab, or directly) while this
              // page was already mounted wouldn't otherwise show up here
              // until something else happened to invalidate this query.
              if (!pickerOpen) refetchCampaignEntities();
            }}
            className="flex items-center gap-[3px] text-micro font-medium text-accent px-[6px] py-[3px] rounded-sm hover:bg-surface-panel cursor-pointer"
          >
            <PlusIcon size={11} />
            Add
          </button>
          {pickerOpen && (
            <div className="absolute right-0 top-[28px] z-30 w-[220px] bg-surface-card-solid border border-border-default rounded-md shadow-popover overflow-hidden">
              <input
                autoFocus
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={`Search ${entityTypeLabel[type].toLowerCase()}s…`}
                className="w-full text-ui text-text-primary px-md py-sm border-b border-border-soft outline-none"
              />
              <div className="max-h-[220px] overflow-y-auto">
                {pickerRows.length === 0 && (
                  <div className="px-md py-sm text-ui text-text-secondary">No matches</div>
                )}
                {pickerRows.map((entity) => (
                  <button
                    key={entity.id}
                    type="button"
                    onClick={() => {
                      addEntity.mutate(entity.id);
                      setPickerOpen(false);
                      setSearch("");
                    }}
                    className="w-full flex items-center gap-sm px-md py-sm text-left hover:bg-surface-panel cursor-pointer"
                  >
                    <EntityIcon type={type} size={12} className={entityColorClasses[type].text} />
                    <span className="text-ui text-text-primary truncate">{entity.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {entities.length === 0 ? (
        <div className="text-label text-text-secondary">{SECTION_EMPTY_COPY[type]}</div>
      ) : (
        <div className="flex flex-wrap gap-xs">
          {entities.map((entity) => (
            <SidebarChip
              key={entity.id}
              campaignId={campaignId}
              entity={entity}
              onRemove={entity.manual ? () => removeEntity.mutate(entity.id) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarChip({
  campaignId,
  entity,
  onRemove,
}: {
  campaignId: string;
  entity: SceneSidebarEntity;
  onRemove?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isDeleted = Boolean(entity.deletedAt);

  const chip = (
    <MentionChip type={entity.type} deleted={isDeleted} manual={entity.manual}>
      {entity.name}
    </MentionChip>
  );

  return (
    <span
      className="relative inline-flex group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {!isDeleted ? <Link href={`/campaigns/${campaignId}/entities/${entity.id}`}>{chip}</Link> : chip}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${entity.name}`}
          className="absolute -top-[5px] -right-[5px] hidden group-hover:flex items-center justify-center w-[14px] h-[14px] rounded-pill bg-surface-card-solid border border-border-default text-text-secondary hover:text-danger-text cursor-pointer"
        >
          <CloseIcon size={7} />
        </button>
      )}
      {hovered && !isDeleted && (
        <span className="absolute z-20" style={{ top: "30px", left: 0 }}>
          <MentionPopover type={entity.type} name={entity.name} summary={entity.summary || "No summary yet."} />
        </span>
      )}
    </span>
  );
}
