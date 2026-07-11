"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Editor } from "@tiptap/core";
import { extractMentionedEntityIds } from "@/lib/mentions/extract";
import type { ResolvedMentionEntity } from "./types";

export interface MentionEditorContextValue {
  campaignId: string;
  resolved: Map<string, ResolvedMentionEntity>;
}

const MentionEditorContext = createContext<MentionEditorContextValue | null>(null);
export const MentionEditorProvider = MentionEditorContext.Provider;

/** Read by MentionNodeView (a node-view portal, still within the same React tree as MentionEditor). */
export function useMentionEditorContext() {
  return useContext(MentionEditorContext);
}

async function fetchResolved(campaignId: string, ids: string[]): Promise<ResolvedMentionEntity[]> {
  if (ids.length === 0) return [];
  const response = await fetch(
    `/api/campaigns/${campaignId}/entities/resolve?ids=${encodeURIComponent(ids.join(","))}`,
  );
  if (!response.ok) return [];
  return response.json();
}

/**
 * Tracks the current doc's mention ids and resolves them to entities,
 * refetching whenever the doc's mention id set changes (edits, undo, a
 * freshly created stub being inserted). This is how renames and soft
 * deletes propagate into chip rendering without the doc itself changing.
 */
export function useResolvedMentions(editor: Editor | null, campaignId: string): Map<string, ResolvedMentionEntity> {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    if (!editor) return;
    function sync() {
      setIds(extractMentionedEntityIds([editor!.getJSON()]));
    }
    sync();
    editor.on("update", sync);
    return () => {
      editor.off("update", sync);
    };
  }, [editor]);

  const key = useMemo(() => [...ids].sort().join(","), [ids]);

  const query = useQuery({
    queryKey: ["campaigns", campaignId, "entities", "resolve", key],
    queryFn: () => fetchResolved(campaignId, key.split(",").filter(Boolean)),
    enabled: key.length > 0,
  });

  return useMemo(() => {
    const map = new Map<string, ResolvedMentionEntity>();
    for (const row of query.data ?? []) map.set(row.id, row);
    return map;
  }, [query.data]);
}
