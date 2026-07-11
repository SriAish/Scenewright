"use client";

import { useState } from "react";
import { ChevronDownIcon } from "@/components/ui";
import { PlainMentionDoc, usePlainDocMentions } from "./PlainMentionDoc";
import type { ScenePredecessor } from "@/hooks/useScene";

export interface PredecessorsPanelProps {
  campaignId: string;
  predecessors: ScenePredecessor[];
}

/**
 * Collapsible "Previous scenes end with…" panel, screen 7: each
 * predecessor's End text, read-only, chips display-only. Hidden
 * entirely when the scene has no predecessors (no empty-state frame
 * exists for this panel; confirmed 2026-07-10).
 */
export function PredecessorsPanel({ campaignId, predecessors }: PredecessorsPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const resolved = usePlainDocMentions(
    campaignId,
    predecessors.map((predecessor) => predecessor.endJson),
  );

  if (predecessors.length === 0) return null;

  return (
    <div className="border border-border-default bg-surface-panel rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="w-full flex items-center justify-between px-base py-sm cursor-pointer"
      >
        <span className="flex items-center gap-sm text-ui font-semibold text-text-label uppercase tracking-wider">
          <ChevronDownIcon className={`text-text-label transition-transform ${expanded ? "rotate-90" : ""}`} />
          Previous scenes end with…
        </span>
        <span className="text-micro text-text-secondary">
          {predecessors.length} {predecessors.length === 1 ? "scene" : "scenes"}
        </span>
      </button>
      {expanded && (
        <div className="flex flex-col px-base pb-md">
          {predecessors.map((predecessor) => (
            <div key={predecessor.id} className="py-sm border-t border-border-default">
              <div className="text-micro font-semibold text-text-button mb-[3px]">{predecessor.name}</div>
              <div className="text-ui leading-[1.55] text-text-secondary">
                <PlainMentionDoc doc={predecessor.endJson} resolved={resolved} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
