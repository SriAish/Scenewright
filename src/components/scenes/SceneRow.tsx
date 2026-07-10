"use client";

import { useEffect, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DragHandleIcon, IconButton, MapIcon, MoreIcon, StatusPill } from "@/components/ui";
import { Scene, SceneStatus } from "@/hooks/useScenes";
import { getFirstNarrationLine } from "./narrationPreview";

const STATUS_LABEL: Record<SceneStatus, string> = {
  not_run: "Not run yet",
  running: "Running",
  completed: "Completed",
  skipped: "Skipped",
};
const STATUS_OPTIONS: SceneStatus[] = ["not_run", "running", "completed", "skipped"];

export interface SceneRowProps {
  scene: Scene;
  onClick: () => void;
  onChangeStatus: (status: SceneStatus) => void;
  onRequestDelete: () => void;
}

/**
 * Scenes list row, screen 5: drag handle, name, status pill, narration
 * preview, and a map-presence icon (entity-presence icons are omitted
 * since there is no data source for them yet in this build step).
 */
export function SceneRow({ scene, onClick, onChangeStatus, onRequestDelete }: SceneRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: scene.id });

  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!statusMenuOpen && !overflowOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (statusMenuOpen && statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
        setStatusMenuOpen(false);
      }
      if (overflowOpen && overflowRef.current && !overflowRef.current.contains(event.target as Node)) {
        setOverflowOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [statusMenuOpen, overflowOpen]);

  const preview = getFirstNarrationLine(scene.narrationJson);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      onClick={onClick}
      className="group flex items-center gap-md px-sm py-md rounded-md cursor-pointer hover:bg-surface-panel"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        onClick={(event) => event.stopPropagation()}
        className="shrink-0 text-border-default hover:text-text-secondary cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <DragHandleIcon />
      </button>

      <div className="w-[230px] shrink-0 text-content font-semibold text-text-primary truncate">{scene.name}</div>

      <div className="relative shrink-0" ref={statusMenuRef}>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setStatusMenuOpen((open) => !open);
          }}
          className="cursor-pointer"
        >
          <StatusPill family="scene" status={scene.status} />
        </button>
        {statusMenuOpen && (
          <div
            onClick={(event) => event.stopPropagation()}
            className="absolute left-0 top-[30px] z-30 w-[170px] bg-surface-card-solid border border-border-default rounded-md shadow-popover p-[6px] flex flex-col gap-[2px]"
          >
            {STATUS_OPTIONS.filter((option) => option !== scene.status).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setStatusMenuOpen(false);
                  onChangeStatus(option);
                }}
                className="text-left text-ui font-medium px-sm py-[8px] rounded-sm text-text-button hover:bg-surface-panel cursor-pointer"
              >
                Mark as {STATUS_LABEL[option]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 text-ui text-text-secondary truncate">{preview}</div>

      {scene.mapImagePath && (
        <div className="shrink-0 text-text-placeholder">
          <MapIcon />
        </div>
      )}

      <div
        className={`relative shrink-0 transition-opacity duration-150 ${overflowOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
        ref={overflowRef}
      >
        <IconButton
          label="Scene actions"
          onClick={(event) => {
            event.stopPropagation();
            setOverflowOpen((open) => !open);
          }}
        >
          <MoreIcon />
        </IconButton>
        {overflowOpen && (
          <div
            onClick={(event) => event.stopPropagation()}
            className="absolute right-0 top-[30px] z-30 w-[170px] bg-surface-card-solid border border-border-default rounded-md shadow-popover p-[6px] flex flex-col gap-[2px]"
          >
            <button
              type="button"
              onClick={() => {
                setOverflowOpen(false);
                onRequestDelete();
              }}
              className="text-left text-ui font-medium px-sm py-[8px] rounded-sm text-danger-text hover:bg-danger-bg-hover cursor-pointer"
            >
              Delete scene
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
