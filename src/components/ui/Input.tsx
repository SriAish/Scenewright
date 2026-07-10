import { InputHTMLAttributes, useId } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

/**
 * Labeled single-line input. Same visual language as the design
 * system's FormField textarea: uppercase micro label, warm-card fill,
 * soft border, radius-lg.
 */
export function Input({ label, id, className, ...rest }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={className}>
      <label
        htmlFor={inputId}
        className="block text-label font-semibold uppercase tracking-wider text-text-label mb-sm"
      >
        {label}
      </label>
      <input
        id={inputId}
        className="w-full font-ui text-content text-text-primary bg-surface-card border border-border-soft rounded-lg px-lg py-base outline-none"
        {...rest}
      />
    </div>
  );
}
