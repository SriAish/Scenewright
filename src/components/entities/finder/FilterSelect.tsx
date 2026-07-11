"use client";

export interface FilterSelectProps {
  label: string;
  value: string | undefined;
  options: string[];
  onChange: (value: string | undefined) => void;
}

/** Filter dropdown, screen 11's Type/Size/Environment/Alignment/Rarity/Category filters. Options are whatever exists in srd_entries, not an invented enum. */
export function FilterSelect({ label, value, options, onChange }: FilterSelectProps) {
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
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
