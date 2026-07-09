import { ReactNode } from "react";
import { EntityIcon, EntityType, entityColorClasses } from "./EntityIcon";

export interface EntityCardProps {
  type: EntityType;
  name: string;
  summary: string;
  thumbnailUrl?: string;
  /** e.g. "Appears in 3 scenes". Omit when the count isn't known yet. */
  appearsInSlot?: ReactNode;
  onClick?: () => void;
  className?: string;
}

const stripePlaceholder =
  "bg-[repeating-linear-gradient(135deg,var(--color-placeholder-stripe-light),var(--color-placeholder-stripe-light)_6px,var(--color-placeholder-stripe-dark)_6px,var(--color-placeholder-stripe-dark)_12px)]";

/**
 * Grid card for entity tabs and the library: thumbnail (or a type-icon
 * placeholder), name, two-line summary, and an optional reverse-lookup
 * count slot.
 */
export function EntityCard({
  type,
  name,
  summary,
  thumbnailUrl,
  appearsInSlot,
  onClick,
  className,
}: EntityCardProps) {
  const palette = entityColorClasses[type];
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      onClick={onClick}
      className={`text-left w-full bg-surface-card-solid border border-border-default rounded-md shadow-card overflow-hidden transition-shadow duration-150 ${onClick ? "cursor-pointer hover:shadow-popover" : ""} ${className ?? ""}`}
    >
      {thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbnailUrl} alt="" className="w-full h-[128px] object-cover" />
      ) : (
        <div className={`flex items-center justify-center w-full h-[128px] ${stripePlaceholder}`}>
          <EntityIcon type={type} size={24} className={palette.text} />
        </div>
      )}
      <div className="p-sm">
        <div className="text-content font-semibold text-text-primary truncate">{name}</div>
        <div className="text-ui text-text-secondary line-clamp-2 mt-[4px]">{summary}</div>
        {appearsInSlot && (
          <div className="text-micro text-text-secondary mt-sm">{appearsInSlot}</div>
        )}
      </div>
    </Tag>
  );
}
