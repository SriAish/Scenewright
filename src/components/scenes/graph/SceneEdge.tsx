"use client";

import { CSSProperties, useState } from "react";
import { BaseEdge, Edge, EdgeLabelRenderer, EdgeProps, getBezierPath } from "@xyflow/react";
import { TrashIcon } from "@/components/ui";
import { useDeleteSceneLink } from "@/hooks/useDeleteSceneLink";
import { SceneLink } from "@/hooks/useSceneLinks";
import { useUpdateSceneLink } from "@/hooks/useUpdateSceneLink";

export interface SceneEdgeData extends Record<string, unknown> {
  link: SceneLink;
  campaignId: string;
}

export type SceneLinkEdge = Edge<SceneEdgeData, "sceneLink">;

/*
  Edge interaction (select to reveal a floating label editor + delete
  button) is not depicted in any source frame, which only shows a
  static labeled edge; this pattern was chosen and confirmed with the
  user rather than invented silently.
*/
export function SceneEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  selected,
  data,
}: EdgeProps<SceneLinkEdge>) {
  const { link, campaignId } = data as SceneEdgeData;
  const updateLink = useUpdateSceneLink(campaignId);
  const deleteLink = useDeleteSceneLink(campaignId);

  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{ stroke: "var(--color-graph-edge)", strokeWidth: selected ? 2 : 1.6 }}
      />
      {selected ? (
        <EdgeLabelRenderer>
          <EdgeLabelEditor
            link={link}
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
            onCommit={(label) => updateLink.mutate({ id: link.id, label })}
            onDelete={() => deleteLink.mutate(link.id)}
          />
        </EdgeLabelRenderer>
      ) : (
        link.label && (
          <EdgeLabelRenderer>
            <div
              style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
              className="absolute nodrag nopan text-micro font-medium text-text-secondary bg-surface-panel px-sm py-[2px] rounded-sm whitespace-nowrap"
            >
              {link.label}
            </div>
          </EdgeLabelRenderer>
        )
      )}
    </>
  );
}

/*
  Mounted only while the edge is selected (see the conditional render
  above), so its draft state naturally initializes from the current
  label on every fresh open, with no effect or ref needed to sync it.
*/
function EdgeLabelEditor({
  link,
  style,
  onCommit,
  onDelete,
}: {
  link: SceneLink;
  style: CSSProperties;
  onCommit: (label: string | null) => void;
  onDelete: () => void;
}) {
  const [labelDraft, setLabelDraft] = useState(link.label ?? "");

  function commitLabel() {
    const trimmed = labelDraft.trim();
    if (trimmed === (link.label ?? "")) return;
    onCommit(trimmed || null);
  }

  return (
    <div
      style={style}
      className="absolute nodrag nopan pointer-events-auto flex items-center gap-[4px] bg-surface-card-solid border border-border-default rounded-sm shadow-popover px-[6px] py-[4px]"
    >
      <input
        autoFocus
        value={labelDraft}
        onChange={(event) => setLabelDraft(event.target.value)}
        onBlur={commitLabel}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        placeholder="Add a label"
        className="text-micro text-text-primary bg-transparent outline-none w-[120px] px-[4px]"
      />
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete link"
        className="shrink-0 text-danger-text hover:bg-danger-bg-hover rounded-sm p-[3px] cursor-pointer"
      >
        <TrashIcon size={12} />
      </button>
    </div>
  );
}
