export type EntityType = "npc" | "monster" | "item";

export interface EntityIconProps {
  type: EntityType;
  size?: number;
  className?: string;
}

/**
 * Geometric entity-type glyphs, paths copied verbatim from the design
 * system (source labels "npc" as "Person"): triangle for monster,
 * head-and-shoulders mark for npc, rounded square for item.
 */
export function EntityIcon({ type, size = 14, className }: EntityIconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 10 10",
    className,
    "aria-hidden": true,
  } as const;

  if (type === "monster") {
    return (
      <svg {...common}>
        <path d="M5 1L9 8.5H1z" fill="currentColor" />
      </svg>
    );
  }

  if (type === "item") {
    return (
      <svg {...common}>
        <rect x="1.5" y="1.5" width="7" height="7" rx="1.5" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="5" cy="3.2" r="2" fill="currentColor" />
      <path d="M1.5 9c0-2 1.5-3.3 3.5-3.3S8.5 7 8.5 9" fill="currentColor" />
    </svg>
  );
}

export const entityTypeLabel: Record<EntityType, string> = {
  npc: "NPC",
  monster: "Monster",
  item: "Item",
};

export const entityColorClasses: Record<EntityType, { bg: string; text: string }> = {
  npc: { bg: "bg-entity-npc-bg", text: "text-entity-npc-text" },
  monster: { bg: "bg-entity-monster-bg", text: "text-entity-monster-text" },
  item: { bg: "bg-entity-item-bg", text: "text-entity-item-text" },
};
