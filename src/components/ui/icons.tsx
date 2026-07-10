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

/** Chevron-left glyph, path copied verbatim from the scene editor header's back link. */
export function BackIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path
        d="M10 3L5 8l5 5"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Chevron-down glyph, path copied verbatim from the campaign and scene editor header status pills. */
export function ChevronDownIcon({ size = 11, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Six-dot drag handle, path copied verbatim from the scenes list row. Non-square: width:height is 10:16. */
export function DragHandleIcon({ size = 10, className }: IconProps) {
  return (
    <svg width={size} height={size * 1.6} viewBox="0 0 10 16" fill="none" className={className} aria-hidden>
      <circle cx="2.5" cy="3" r="1.3" fill="currentColor" />
      <circle cx="7.5" cy="3" r="1.3" fill="currentColor" />
      <circle cx="2.5" cy="8" r="1.3" fill="currentColor" />
      <circle cx="7.5" cy="8" r="1.3" fill="currentColor" />
      <circle cx="2.5" cy="13" r="1.3" fill="currentColor" />
      <circle cx="7.5" cy="13" r="1.3" fill="currentColor" />
    </svg>
  );
}

/** Open-book glyph, path copied verbatim from the scenes list row's map-presence indicator. */
export function MapIcon({ size = 14, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path
        d="M2 4l4-1.5 4 1.5 4-1.5v9.5l-4 1.5-4-1.5-4 1.5z"
        stroke="currentColor"
        strokeWidth={1.3}
        strokeLinejoin="round"
      />
      <path d="M6 2.5v9.5M10 4v9.5" stroke="currentColor" strokeWidth={1.3} />
    </svg>
  );
}

/** Auto-arrange glyph, path copied verbatim from the graph view's floating toolbar. */
export function AutoArrangeIcon({ size = 15, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <rect x="2" y="2" width="4" height="4" rx="1" stroke="currentColor" strokeWidth={1.3} />
      <rect x="10" y="2" width="4" height="4" rx="1" stroke="currentColor" strokeWidth={1.3} />
      <rect x="2" y="10" width="4" height="4" rx="1" stroke="currentColor" strokeWidth={1.3} />
      <rect x="10" y="10" width="4" height="4" rx="1" stroke="currentColor" strokeWidth={1.3} />
      <path d="M6 4h4M6 12h4M4 6v4M12 6v4" stroke="currentColor" strokeWidth={1.1} />
    </svg>
  );
}

/** Zoom-out glyph, path copied verbatim from the graph view's floating toolbar. */
export function ZoomOutIcon({ size = 15, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth={1.3} />
      <path d="M5 7h4M11 11l3.5 3.5" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" />
    </svg>
  );
}

/** Zoom-in glyph, path copied verbatim from the graph view's floating toolbar. */
export function ZoomInIcon({ size = 15, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth={1.3} />
      <path d="M7 5v4M5 7h4M11 11l3.5 3.5" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" />
    </svg>
  );
}

/**
 * Trash glyph for the edge mini-editor's delete action. Not present in
 * any source frame (the graph view design has no selected-edge state);
 * drawn to match this file's existing thin-stroke, rounded-cap style.
 */
export function TrashIcon({ size = 13, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path
        d="M3 4.5h10M6.5 4.5V3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1.5M6.5 7.5v4M9.5 7.5v4"
        stroke="currentColor"
        strokeWidth={1.3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 4.5l.6 8.4a1 1 0 0 0 1 .9h4.8a1 1 0 0 0 1-.9l.6-8.4"
        stroke="currentColor"
        strokeWidth={1.3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
