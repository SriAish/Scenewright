"use client";

export interface LabeledSelectOption {
  value: string;
  label: string;
}

export interface LabeledSelectProps {
  label: string;
  value: string | undefined;
  options: LabeledSelectOption[];
  onChange: (value: string | undefined) => void;
}

/**
 * Generation modal dropdown: value/label pairs (race keys like "halfElf"
 * need a display label like "Half-Elf"), unlike the finder's FilterSelect
 * which only ever shows the raw filter-column value. Same visual
 * language as FilterSelect, kept as a separate component so the finder
 * isn't touched by this build step.
 */
export function LabeledSelect({ label, value, options, onChange }: LabeledSelectProps) {
  return (
    <div>
      <span className="block text-[10.5px] font-semibold uppercase tracking-wider text-text-label mb-[5px]">
        {label}
      </span>
      <select
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || undefined)}
        className="w-full text-[13px] text-text-primary bg-surface-card border border-border-soft rounded-sm px-[10px] py-[8px] outline-none cursor-pointer"
      >
        <option value="">Any</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
