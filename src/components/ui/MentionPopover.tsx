import { EntityIcon, EntityType, entityColorClasses, entityTypeLabel } from "./EntityIcon";

export interface MentionPopoverProps {
  type: EntityType;
  name: string;
  summary: string;
  thumbnailUrl?: string;
  className?: string;
}

/**
 * Hover popover shown for an inline @mention: a swatch (thumbnail or
 * type icon), the entity name, its type label, and a two-line summary.
 * Presentational only, no data fetching.
 */
export function MentionPopover({ type, name, summary, thumbnailUrl, className }: MentionPopoverProps) {
  const palette = entityColorClasses[type];

  return (
    <div
      className={`flex items-start gap-[12px] w-[260px] bg-surface-card-solid border border-border-default rounded-md shadow-popover p-md ${className ?? ""}`}
    >
      {thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailUrl}
          alt=""
          className="w-[32px] h-[32px] rounded-sm object-cover shrink-0"
        />
      ) : (
        <div
          className={`flex items-center justify-center w-[32px] h-[32px] rounded-sm shrink-0 ${palette.bg}`}
        >
          <EntityIcon type={type} size={16} className={palette.text} />
        </div>
      )}
      <div className="min-w-0">
        <div className="text-[15px] font-semibold text-text-primary truncate">{name}</div>
        <div className={`text-micro font-medium uppercase tracking-wider ${palette.text} mt-[2px] mb-[6px]`}>
          {entityTypeLabel[type]}
        </div>
        <div className="text-ui leading-[1.5] text-text-secondary line-clamp-2">{summary}</div>
      </div>
    </div>
  );
}
