import { EntityIcon, EntityType, entityColorClasses } from "@/components/ui";

const stripePlaceholder =
  "bg-[repeating-linear-gradient(135deg,var(--color-placeholder-stripe-light),var(--color-placeholder-stripe-light)_6px,var(--color-placeholder-stripe-dark)_6px,var(--color-placeholder-stripe-dark)_12px)]";

export interface EntityPortraitProps {
  type: EntityType;
}

/**
 * Entity detail image slot, screen 9: type-icon placeholder, upload
 * disabled ("coming soon", temporary) since uploads don't exist yet.
 */
export function EntityPortrait({ type }: EntityPortraitProps) {
  const palette = entityColorClasses[type];

  return (
    <div
      title="Image upload coming soon"
      className={`relative flex items-center justify-center w-[76px] h-[76px] rounded-lg border border-border-soft shrink-0 overflow-hidden ${stripePlaceholder}`}
    >
      <EntityIcon type={type} size={28} className={palette.text} />
    </div>
  );
}
