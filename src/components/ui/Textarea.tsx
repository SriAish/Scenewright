import { TextareaHTMLAttributes, useId } from "react";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

/**
 * Labeled multi-line textarea. Same visual language as Input: uppercase
 * micro label, warm-card fill, soft border, radius-lg. Extension beyond
 * the reviewed base set: the design system's FormField component covers
 * this as an `as="textarea"` variant, which this app's base components
 * had not yet split out into its own component.
 */
export function Textarea({ label, id, className, ...rest }: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;

  return (
    <div className={className}>
      <label
        htmlFor={textareaId}
        className="block text-label font-semibold uppercase tracking-wider text-text-label mb-sm"
      >
        {label}
      </label>
      <textarea
        id={textareaId}
        className="w-full font-ui text-content text-text-primary bg-surface-card border border-border-soft rounded-lg px-lg py-base outline-none resize-none"
        {...rest}
      />
    </div>
  );
}
