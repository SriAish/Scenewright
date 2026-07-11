"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
import { EntityIcon, PlusIcon, entityColorClasses } from "@/components/ui";
import type { MentionCommandPayload, MentionEntityType, MentionSearchResult } from "./types";

export interface MentionDropdownHandle {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

// "Person" matches the source frame's dropdown row label verbatim (screens.md
// screen 7 / Claude Design "Scene Editor" canvas, state 2a); it diverges from
// entityTypeLabel's "NPC" used elsewhere, which is a deliberate frame match,
// not an inconsistency to fix.
const TYPE_ROW_LABEL: Record<MentionEntityType, string> = { npc: "Person", monster: "Monster", item: "Item" };

// Not from a frame (the settled design shows one generic create row with no
// type step; per product decision, that row opens this type picker instead
// of three per-type rows). Copy matches NewEntityModal's existing "New
// {label}" vocabulary (character/monster/item) for consistency.
const CREATE_TYPE_LABEL: Record<MentionEntityType, string> = { npc: "character", monster: "monster", item: "item" };
const CREATE_TYPES: MentionEntityType[] = ["npc", "monster", "item"];

type Row =
  | { kind: "entity"; item: MentionSearchResult }
  | { kind: "create" }
  | { kind: "create-type"; entityType: MentionEntityType };

function rowKey(row: Row): string {
  if (row.kind === "entity") return `entity-${row.item.id}`;
  if (row.kind === "create") return "create";
  return `create-type-${row.entityType}`;
}

/**
 * @ / [[ mention autocomplete dropdown, screen 7 state 2a. Two views:
 * the entity list (matches + one generic "Create new" row), and, after
 * that row is picked, a type picker (product decision: the frame's
 * single generic create row opens this rather than showing three
 * per-type rows up front).
 */
export const MentionDropdown = forwardRef<
  MentionDropdownHandle,
  SuggestionProps<MentionSearchResult, MentionCommandPayload>
>(function MentionDropdown(props, ref) {
  const { items, query, command } = props;
  const [pickingType, setPickingType] = useState(false);
  const [selected, setSelected] = useState(0);

  const rows: Row[] = pickingType
    ? CREATE_TYPES.map((entityType): Row => ({ kind: "create-type", entityType }))
    : [...items.map((item): Row => ({ kind: "entity", item })), { kind: "create" }];

  useEffect(() => {
    setSelected(0);
  }, [pickingType, items.length]);

  function selectRow(index: number) {
    const row = rows[index];
    if (!row) return;
    if (row.kind === "entity") {
      command({ kind: "existing", id: row.item.id, entityType: row.item.type });
      return;
    }
    if (row.kind === "create") {
      setPickingType(true);
      return;
    }
    command({ kind: "create", entityType: row.entityType, name: query });
  }

  useImperativeHandle(ref, () => ({
    onKeyDown(keyProps) {
      if (keyProps.event.key === "ArrowDown") {
        setSelected((current) => (current + 1) % rows.length);
        return true;
      }
      if (keyProps.event.key === "ArrowUp") {
        setSelected((current) => (current - 1 + rows.length) % rows.length);
        return true;
      }
      if (keyProps.event.key === "Enter") {
        selectRow(selected);
        return true;
      }
      if (keyProps.event.key === "Escape" && pickingType) {
        setPickingType(false);
        return true;
      }
      return false;
    },
  }));

  return (
    <div className="w-[270px] bg-surface-card-solid border border-border-default rounded-lg shadow-popover overflow-hidden">
      <div className="px-md pt-sm pb-[6px] text-micro font-semibold text-text-label uppercase tracking-wider border-b border-border-soft">
        {pickingType ? `Create "${query}" as…` : "Mention an entity"}
      </div>
      <div className="flex flex-col">
        {rows.length === 0 && <div className="px-md py-sm text-ui text-text-secondary">No matching entities</div>}
        {rows.map((row, index) => {
          const isDivider = !pickingType && row.kind === "create";
          return (
            <button
              key={rowKey(row)}
              type="button"
              onMouseEnter={() => setSelected(index)}
              onClick={() => selectRow(index)}
              className={`flex items-center gap-sm px-md py-sm text-left cursor-pointer ${
                index === selected ? "bg-surface-panel" : ""
              } ${isDivider ? "border-t border-border-soft" : ""}`}
            >
              {row.kind === "entity" && (
                <>
                  <EntityIcon type={row.item.type} size={14} className={entityColorClasses[row.item.type].text} />
                  <span className="text-ui font-medium text-text-primary truncate">{row.item.name}</span>
                  <span
                    className={`ml-auto text-micro font-medium ${entityColorClasses[row.item.type].text}`}
                  >
                    {TYPE_ROW_LABEL[row.item.type]}
                  </span>
                </>
              )}
              {row.kind === "create" && (
                <>
                  <PlusIcon size={14} className="text-accent shrink-0" />
                  <span className="text-ui font-medium text-accent truncate">Create new &ldquo;{query}…&rdquo;</span>
                </>
              )}
              {row.kind === "create-type" && (
                <>
                  <EntityIcon type={row.entityType} size={14} className={entityColorClasses[row.entityType].text} />
                  <span className="text-ui font-medium text-text-primary truncate">
                    Create {CREATE_TYPE_LABEL[row.entityType]} &ldquo;{query}&rdquo;
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});
