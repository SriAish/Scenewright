"use client";

import { ReactNode } from "react";
import type { ItemFilterState } from "@/hooks/useSrdSearch";
import type { SrdFilterOptions } from "@/hooks/useSrdFilterOptions";
import { FilterSelect } from "./FilterSelect";

export interface ItemFilterFieldsProps {
  filters: ItemFilterState;
  options: SrdFilterOptions | undefined;
  onChange: (next: ItemFilterState) => void;
}

export function ItemFilterFields({ filters, options, onChange }: ItemFilterFieldsProps) {
  return (
    <div className="grid grid-cols-3 gap-[10px]">
      <FilterSelect
        label="Rarity"
        value={filters.rarity}
        options={options?.rarity ?? []}
        onChange={(value) => onChange({ ...filters, rarity: value })}
      />
      <FilterSelect
        label="Category"
        value={filters.category}
        options={options?.category ?? []}
        onChange={(value) => onChange({ ...filters, category: value })}
      />
      <AttunementFilter value={filters.attunement} onChange={(value) => onChange({ ...filters, attunement: value })} />
    </div>
  );
}

/*
  The source frame uses a plain on/off toggle for this filter, matching
  the entity-detail attunement toggle's look. That reads as "off = no
  filter, on = requires attunement" and has no way to filter to
  attunement === false, but the build instructions require both true and
  false to work. A three-way segmented control (reusing the Library
  screen's existing segmented-control pattern rather than inventing a
  new control) is the smallest change that satisfies both true and false
  filtering plus an explicit "any" state.
*/
function AttunementFilter({ value, onChange }: { value: boolean | undefined; onChange: (value: boolean | undefined) => void }) {
  return (
    <div>
      <span className="block text-[10.5px] font-semibold uppercase tracking-wider text-text-label mb-[5px]">
        Attunement
      </span>
      <div className="inline-flex bg-surface-card border border-border-soft rounded-sm p-[3px] gap-[2px]">
        <SegButton active={value === undefined} onClick={() => onChange(undefined)}>
          Any
        </SegButton>
        <SegButton active={value === true} onClick={() => onChange(true)}>
          Required
        </SegButton>
        <SegButton active={value === false} onClick={() => onChange(false)}>
          No
        </SegButton>
      </div>
    </div>
  );
}

function SegButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-[12px] font-medium px-[9px] py-[5px] rounded-[6px] cursor-pointer whitespace-nowrap transition-colors duration-150 ${
        active ? "bg-surface-card-solid text-text-primary shadow-card" : "text-text-secondary"
      }`}
    >
      {children}
    </button>
  );
}
