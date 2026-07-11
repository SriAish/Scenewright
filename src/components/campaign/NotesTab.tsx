"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useUpdateCampaignNotes } from "@/hooks/useUpdateCampaignNotes";

/*
  Dynamically imported so Tiptap only loads for the Notes tab, per
  architecture.md's performance configuration. Same pattern as
  /editor-preview.
*/
const MentionEditor = dynamic(() => import("@/components/editor/MentionEditor").then((mod) => mod.MentionEditor), {
  ssr: false,
  loading: () => <div className="text-ui text-text-secondary px-lg py-base">Loading editor...</div>,
});

export interface NotesTabProps {
  campaignId: string;
  initialNotesJson: unknown;
}

/**
 * Notes tab, screen 14: one full-width mention-enabled document,
 * autosaved, no save button. First real screen to adopt MentionEditor.
 */
export function NotesTab({ campaignId, initialNotesJson }: NotesTabProps) {
  const updateNotes = useUpdateCampaignNotes(campaignId);
  const [savedNotice, setSavedNotice] = useState(false);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );

  function handleSave(doc: unknown) {
    updateNotes.mutate(doc, {
      onSuccess: () => {
        setSavedNotice(true);
        if (noticeTimer.current) clearTimeout(noticeTimer.current);
        noticeTimer.current = setTimeout(() => setSavedNotice(false), 2000);
      },
    });
  }

  return (
    <div className="flex-1 flex flex-col gap-sm px-xl py-xl">
      <div className="flex items-center gap-sm">
        <h1 className="font-display italic font-semibold text-[22px] text-text-primary">Campaign notes</h1>
        {(updateNotes.isPending || savedNotice) && (
          <span className="text-micro text-text-secondary">
            {updateNotes.isPending ? "Saving..." : "Saved"}
          </span>
        )}
      </div>
      <p className="text-ui text-text-secondary leading-[1.5]">
        Session outcomes, table decisions, anything worth remembering.
      </p>

      <MentionEditor
        campaignId={campaignId}
        value={initialNotesJson}
        onSave={handleSave}
        className="mt-sm"
      />
    </div>
  );
}
