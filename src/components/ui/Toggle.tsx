export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}

/** Boolean switch. Source: entity detail item variant's Attunement toggle. */
export function Toggle({ checked, onChange, label, disabled, className }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-[38px] h-[22px] rounded-pill shrink-0 transition-colors duration-150 ${checked ? "bg-accent" : "bg-border-default"} ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${className ?? ""}`}
    >
      <span
        className={`absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-pill bg-white shadow-card transition-transform duration-150 ${checked ? "translate-x-[16px]" : "translate-x-0"}`}
      />
    </button>
  );
}
