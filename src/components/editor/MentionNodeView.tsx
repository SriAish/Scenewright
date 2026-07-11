"use client";

import { useState } from "react";
import Link from "next/link";
import { NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import { EntityIcon, MentionPopover, entityColorClasses } from "@/components/ui";
import { useMentionEditorContext } from "./MentionEditorContext";
import type { MentionEntityType } from "./types";

/*
  Inline mention chip, screen 7 states 1a/2a: rendered inline in prose,
  distinct from the sidebar MentionChip base component (which its own
  docstring reserves for sidebar/panel contexts). Sizing and spacing
  match the source frame's inline chip markup exactly (padding
  "1px 7px 1px 5px", 10px icon, 4px gap); colors reuse the same
  entity-type tokens as the sidebar chip. Hover popover reuses the
  existing MentionPopover base component, which was built for exactly
  this purpose.
*/
export function MentionNodeView({ node }: ReactNodeViewProps) {
  const [hovered, setHovered] = useState(false);
  const context = useMentionEditorContext();
  const id = node.attrs.id as string | null;
  const fallbackType = (node.attrs.entityType as MentionEntityType | null) ?? "npc";

  const resolved = id ? context?.resolved.get(id) : undefined;
  const isDeleted = Boolean(resolved?.deletedAt);
  const displayType = resolved?.type ?? fallbackType;
  const displayName = resolved?.name ?? "…";
  const palette = entityColorClasses[displayType];

  const chip = (
    <span
      className={`inline-flex items-center gap-[4px] rounded-pill py-[1px] pl-[5px] pr-[7px] text-nav font-medium align-baseline ${
        isDeleted ? "bg-surface-panel text-text-placeholder" : `${palette.bg} ${palette.text}`
      }`}
    >
      <EntityIcon type={displayType} size={10} />
      {displayName}
    </span>
  );

  return (
    <NodeViewWrapper as="span" style={{ position: "relative", display: "inline-block" }} contentEditable={false}>
      <span onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
        {resolved && !isDeleted && context ? (
          <Link href={`/campaigns/${context.campaignId}/entities/${id}`}>{chip}</Link>
        ) : (
          chip
        )}
        {hovered && resolved && (
          <span className="absolute z-20" style={{ top: "26px", left: 0 }}>
            <MentionPopover
              type={resolved.type}
              name={resolved.name}
              summary={resolved.summary || "No summary yet."}
            />
          </span>
        )}
      </span>
    </NodeViewWrapper>
  );
}
