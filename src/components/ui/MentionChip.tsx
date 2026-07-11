import { EntityIcon, EntityType, entityColorClasses } from "./EntityIcon";

export interface MentionChipProps {
  type: EntityType;
  children: string;
  /** Soft-deleted entity: mention renders as an inactive, greyed chip. */
  deleted?: boolean;
  /**
   * Distinguishes sidebar chips added manually (dashed border) from ones
   * auto-populated from mentions (solid, no border). Confirmed against
   * the Scene Editor Claude Design frame (states 1a/2b): the mentioned
   * entities (Kaelen, Mira) render solid, and the one absent from the
   * visible text (Old Fenwick) renders dashed and greyed. This supersedes
   * screens.md's "auto gets the dotted border" prose, which describes the
   * opposite mapping. Filled-pill context only; not used for inline
   * narration mentions.
   */
  manual?: boolean;
  className?: string;
}

/**
 * Inline entity tag with a type icon. Filled pill chip, used in sidebar
 * lists and Characters/Monsters/Items panels.
 */
export function MentionChip({
  type,
  children,
  deleted = false,
  manual = false,
  className,
}: MentionChipProps) {
  const palette = entityColorClasses[type];
  const colorClasses = deleted
    ? "bg-surface-panel text-text-placeholder"
    : `${palette.bg} ${palette.text}`;
  const borderClasses = manual
    ? `border border-dashed ${deleted ? "border-border-soft" : "border-current"}`
    : "";

  return (
    <span
      className={`inline-flex items-center gap-[5px] rounded-pill py-[4px] pl-[7px] pr-[10px] text-ui font-medium ${colorClasses} ${borderClasses} ${className ?? ""}`}
    >
      <EntityIcon type={type} size={13} />
      {children}
    </span>
  );
}
