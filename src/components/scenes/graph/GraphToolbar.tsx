"use client";

import { useReactFlow, useViewport } from "@xyflow/react";
import { AutoArrangeIcon, Button, IconButton, PlusIcon, ZoomInIcon, ZoomOutIcon } from "@/components/ui";

export interface GraphToolbarProps {
  onAutoArrange: () => void;
  onNewScene: () => void;
}

/** Floating top-left toolbar, screen 6: auto-arrange, zoom controls, New scene. */
export function GraphToolbar({ onAutoArrange, onNewScene }: GraphToolbarProps) {
  const { zoomIn, zoomOut } = useReactFlow();
  const { zoom } = useViewport();

  return (
    <div className="flex items-center gap-[4px] p-[5px] rounded-md bg-surface-card-solid border border-border-default shadow-popover">
      <IconButton label="Auto-arrange" onClick={onAutoArrange}>
        <AutoArrangeIcon />
      </IconButton>
      <div className="w-px h-[20px] bg-border-default" />
      <IconButton label="Zoom out" onClick={() => zoomOut({ duration: 150 })}>
        <ZoomOutIcon />
      </IconButton>
      <span className="text-micro font-medium text-text-secondary px-[4px] min-w-[34px] text-center">
        {Math.round(zoom * 100)}%
      </span>
      <IconButton label="Zoom in" onClick={() => zoomIn({ duration: 150 })}>
        <ZoomInIcon />
      </IconButton>
      <div className="w-px h-[20px] bg-border-default" />
      <Button variant="primary" size="sm" onClick={onNewScene}>
        <PlusIcon />
        New scene
      </Button>
    </div>
  );
}
