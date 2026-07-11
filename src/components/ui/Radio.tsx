import { ReactNode } from "react";

export interface RadioOptionProps {
  checked: boolean;
  onSelect: () => void;
  label: ReactNode;
  description?: ReactNode;
  className?: string;
}

/**
 * One radio row: dot + label (+ optional muted description line). Used
 * by the import modal's variant picker (screen 12) and the shared
 * backstory-reference confirm step's flatten/copy choice. Same visual
 * language as Toggle: filled circle on accent when selected.
 */
export function RadioOption({ checked, onSelect, label, description, className }: RadioOptionProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={`w-full flex items-start gap-sm text-left cursor-pointer ${className ?? ""}`}
    >
      <span
        className={`mt-[2px] shrink-0 w-[16px] h-[16px] rounded-pill border flex items-center justify-center transition-colors duration-150 ${
          checked ? "border-accent" : "border-border-default"
        }`}
      >
        {checked && <span className="w-[8px] h-[8px] rounded-pill bg-accent" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-ui font-medium text-text-primary">{label}</span>
        {description && <span className="block text-micro text-text-secondary mt-[2px]">{description}</span>}
      </span>
    </button>
  );
}
