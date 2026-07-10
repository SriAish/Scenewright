export interface IconProps {
  size?: number;
  className?: string;
}

/** Close glyph, path copied verbatim from the design system's modal close button. */
export function CloseIcon({ size = 13, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M1 1l12 12M13 1L1 13"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Plus glyph, path copied verbatim from the design system's "New campaign" / "New scene" buttons. */
export function PlusIcon({ size = 12, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M8 3v10M3 8h10"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Three-dot overflow glyph, path copied verbatim from the campaign
 * header and entity detail rail's overflow buttons in the design
 * system. Not yet split into its own component prior to this step.
 */
export function MoreIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size * 0.25}
      viewBox="0 0 16 4"
      fill="none"
      className={className}
      aria-hidden
    >
      <circle cx="2" cy="2" r="1.7" fill="currentColor" />
      <circle cx="8" cy="2" r="1.7" fill="currentColor" />
      <circle cx="14" cy="2" r="1.7" fill="currentColor" />
    </svg>
  );
}
