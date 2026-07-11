"use client";

import type { MonsterFilterState } from "@/hooks/useSrdSearch";
import type { SrdFilterOptions } from "@/hooks/useSrdFilterOptions";
import { CR_SCALE } from "./crScale";
import { CrRangeSlider } from "./CrRangeSlider";
import { FilterSelect } from "./FilterSelect";

export interface MonsterFilterFieldsProps {
  filters: MonsterFilterState;
  options: SrdFilterOptions | undefined;
  onChange: (next: MonsterFilterState) => void;
}

export function MonsterFilterFields({ filters, options, onChange }: MonsterFilterFieldsProps) {
  const minIndex = filters.crMin !== undefined ? Math.max(CR_SCALE.indexOf(filters.crMin), 0) : 0;
  const maxIndex = filters.crMax !== undefined ? Math.max(CR_SCALE.indexOf(filters.crMax), 0) : CR_SCALE.length - 1;

  return (
    <div className="flex flex-col gap-[14px]">
      <CrRangeSlider
        minIndex={minIndex}
        maxIndex={maxIndex}
        onChange={(nextMin, nextMax) => onChange({ ...filters, crMin: CR_SCALE[nextMin], crMax: CR_SCALE[nextMax] })}
      />
      <div className="grid grid-cols-4 gap-[10px]">
        <FilterSelect
          label="Type"
          value={filters.monsterType}
          options={options?.monsterType ?? []}
          onChange={(value) => onChange({ ...filters, monsterType: value })}
        />
        <FilterSelect
          label="Size"
          value={filters.size}
          options={options?.size ?? []}
          onChange={(value) => onChange({ ...filters, size: value })}
        />
        <FilterSelect
          label="Environment"
          value={filters.environment}
          options={options?.environment ?? []}
          onChange={(value) => onChange({ ...filters, environment: value })}
        />
        <FilterSelect
          label="Alignment"
          value={filters.alignment}
          options={options?.alignment ?? []}
          onChange={(value) => onChange({ ...filters, alignment: value })}
        />
      </div>
    </div>
  );
}
