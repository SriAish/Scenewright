export type FilterValue = "all" | "draft" | "running" | "completed";

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "running", label: "Running" },
  { value: "completed", label: "Completed" },
];

export interface StatusFilterProps {
  value: FilterValue;
  onChange: (value: FilterValue) => void;
}

/** Segmented control, screen 2's status filter above the campaign grid. */
export function StatusFilter({ value, onChange }: StatusFilterProps) {
  return (
    <div className="inline-flex items-center p-[3px] rounded-sm bg-surface-panel gap-[2px] shrink-0">
      {FILTERS.map((filter) => (
        <button
          key={filter.value}
          type="button"
          onClick={() => onChange(filter.value)}
          className={`px-[14px] py-[6px] rounded-sm text-ui font-medium cursor-pointer transition-colors duration-150 ${
            value === filter.value
              ? "bg-surface-card-solid text-text-primary shadow-card"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
