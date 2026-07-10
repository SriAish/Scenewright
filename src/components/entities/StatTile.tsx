"use client";

import { useDraftField } from "./useDraftField";

export interface StatTileProps {
  label: string;
  value: string;
  onCommit: (value: string) => void;
}

/** Single-field statblock tile: label + editable value, edit-in-place on blur. */
export function StatTile({ label, value, onCommit }: StatTileProps) {
  const field = useDraftField(value, onCommit);

  return (
    <div className="flex flex-col items-center gap-[4px] bg-surface-card border border-border-soft rounded-sm py-[10px] px-[6px]">
      <span className="text-micro font-semibold uppercase tracking-wider text-text-label">{label}</span>
      <input
        {...field}
        aria-label={label}
        className="w-full text-[15px] font-semibold text-text-primary text-center bg-transparent outline-none"
      />
    </div>
  );
}
