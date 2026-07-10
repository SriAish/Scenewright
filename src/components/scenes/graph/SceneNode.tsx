"use client";

import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import { MapIcon } from "@/components/ui";
import { Scene, SceneStatus } from "@/hooks/useScenes";
import { GRAPH_NODE_HEIGHT, GRAPH_NODE_WIDTH } from "./layout";

const STRIPE_CLASS: Record<SceneStatus, string> = {
  not_run: "bg-status-not-run-dot",
  running: "bg-status-running-dot",
  completed: "bg-status-completed-dot",
  skipped: "bg-status-skipped-border",
};
const DOT_CLASS: Record<SceneStatus, string | null> = {
  not_run: "bg-status-not-run-dot",
  running: "bg-status-running-dot",
  completed: "bg-status-completed-dot",
  skipped: null,
};
const TEXT_CLASS: Record<SceneStatus, string> = {
  not_run: "text-status-not-run-text",
  running: "text-status-running-text",
  completed: "text-status-completed-text",
  skipped: "text-status-skipped-text",
};
const STATUS_LABEL: Record<SceneStatus, string> = {
  not_run: "Not run yet",
  running: "Running",
  completed: "Completed",
  skipped: "Skipped",
};

export interface SceneNodeData extends Record<string, unknown> {
  scene: Scene;
}

export type SceneFlowNode = Node<SceneNodeData, "sceneNode">;

/**
 * Graph view scene node, screen 6: rounded card, status color as a
 * left edge stripe, map badge only when a map is set. Orphan nodes
 * (no edges) render with this same chassis, no warning styling.
 */
export function SceneNode({ data, selected }: NodeProps<SceneFlowNode>) {
  const { scene } = data;
  const skipped = scene.status === "skipped";
  const dotClass = DOT_CLASS[scene.status];

  return (
    <div
      style={{ width: GRAPH_NODE_WIDTH, height: GRAPH_NODE_HEIGHT }}
      className={`flex items-stretch bg-surface-card-solid rounded-md shadow-card overflow-hidden ${
        selected
          ? "border-[1.5px] border-accent shadow-popover"
          : skipped
            ? "border border-dashed border-status-skipped-border"
            : "border border-border-default"
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-[8px] !h-[8px] !bg-surface-card-solid !border !border-border-default"
      />
      <div className={`w-[4px] shrink-0 ${STRIPE_CLASS[scene.status]}`} />
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-[6px] px-md py-sm">
        <div className="text-content font-semibold text-text-primary truncate">{scene.name}</div>
        <div className="flex items-center gap-[6px]">
          {dotClass && <span className={`w-[5px] h-[5px] rounded-pill shrink-0 ${dotClass}`} />}
          <span className={`text-micro font-medium ${TEXT_CLASS[scene.status]}`}>{STATUS_LABEL[scene.status]}</span>
          {scene.mapImagePath && <MapIcon size={12} className="ml-auto text-text-placeholder shrink-0" />}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-[8px] !h-[8px] !bg-surface-card-solid !border !border-border-default"
      />
    </div>
  );
}
