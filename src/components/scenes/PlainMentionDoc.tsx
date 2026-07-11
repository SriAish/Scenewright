"use client";

import { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { EntityIcon, EntityType, entityColorClasses } from "@/components/ui";
import { extractMentionedEntityIds } from "@/lib/mentions/extract";
import type { ResolvedMentionEntity } from "@/components/editor/types";

interface DocNode {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: DocNode[];
}

async function fetchResolved(campaignId: string, ids: string[]): Promise<ResolvedMentionEntity[]> {
  if (ids.length === 0) return [];
  const response = await fetch(
    `/api/campaigns/${campaignId}/entities/resolve?ids=${encodeURIComponent(ids.join(","))}`,
  );
  if (!response.ok) return [];
  return response.json();
}

/** Resolves every mention across a set of read-only docs in one batched request. */
export function usePlainDocMentions(campaignId: string, docs: unknown[]): Map<string, ResolvedMentionEntity> {
  const ids = extractMentionedEntityIds(docs);
  const key = [...ids].sort().join(",");

  const query = useQuery({
    queryKey: ["campaigns", campaignId, "entities", "resolve", key],
    queryFn: () => fetchResolved(campaignId, key.split(",").filter(Boolean)),
    enabled: key.length > 0,
  });

  const map = new Map<string, ResolvedMentionEntity>();
  for (const row of query.data ?? []) map.set(row.id, row);
  return map;
}

function renderInline(nodes: DocNode[] | undefined, resolved: Map<string, ResolvedMentionEntity>): ReactNode[] {
  return (nodes ?? []).map((node, index) => {
    if (node.type === "text") {
      return node.text;
    }
    if (node.type === "mention") {
      const id = node.attrs?.id as string | undefined;
      const entity = id ? resolved.get(id) : undefined;
      const fallbackType = (node.attrs?.entityType as EntityType | undefined) ?? "npc";
      const type = entity?.type ?? fallbackType;
      const isDeleted = Boolean(entity?.deletedAt);
      const palette = entityColorClasses[type];
      return (
        <span
          key={index}
          className={`inline-flex items-center gap-[4px] rounded-pill py-[1px] pl-[5px] pr-[7px] text-nav font-medium align-baseline ${
            isDeleted ? "bg-surface-panel text-text-placeholder" : `${palette.bg} ${palette.text}`
          }`}
        >
          <EntityIcon type={type} size={9} />
          {entity?.name ?? "…"}
        </span>
      );
    }
    return null;
  });
}

/**
 * Read-only rendering of a Tiptap doc: plain text runs plus static,
 * non-interactive mention chips (no hover popover, no click-through),
 * per the predecessors panel's "plain rendering of the JSON, chips
 * display-only" spec. No Tiptap editor instance involved.
 */
export function PlainMentionDoc({
  doc,
  resolved,
  className,
}: {
  doc: unknown;
  resolved: Map<string, ResolvedMentionEntity>;
  className?: string;
}) {
  const paragraphs = (doc as DocNode | null)?.content ?? [];

  return (
    <span className={className}>
      {paragraphs.map((paragraph, index) => (
        <span key={index}>
          {index > 0 && " "}
          {renderInline(paragraph.content, resolved)}
        </span>
      ))}
    </span>
  );
}
