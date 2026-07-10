"use client";

import { Input, Textarea, Toggle } from "@/components/ui";
import { ItemData } from "@/hooks/useEntities";
import { useDraftField } from "./useDraftField";

export interface ItemFieldsProps {
  data: ItemData;
  onCommit: (data: ItemData) => void;
}

/**
 * Item type-specific fields, screen 9's item variant. Rarity and
 * category are free-text (no enumerated option list is specified
 * anywhere in the docs, so none is invented here); description is
 * plain text, no rich text, per features-and-decisions.md.
 */
export function ItemFields({ data, onCommit }: ItemFieldsProps) {
  const rarity = useDraftField(data.rarity ?? "", (value) => onCommit({ ...data, rarity: value }));
  const category = useDraftField(data.category ?? "", (value) => onCommit({ ...data, category: value }));
  const description = useDraftField(data.description ?? "", (value) => onCommit({ ...data, description: value }));

  return (
    <>
      <div className="flex gap-md">
        <Input label="Rarity" className="flex-1" {...rarity} />
        <Input label="Category" className="flex-1" {...category} />
        <div className="flex flex-col gap-sm">
          <span className="block text-label font-semibold uppercase tracking-wider text-text-label">
            Attunement
          </span>
          <div className="h-[41px] flex items-center">
            <Toggle
              checked={data.attunement ?? false}
              onChange={(checked) => onCommit({ ...data, attunement: checked })}
              label="Requires attunement"
            />
          </div>
        </div>
      </div>
      <Textarea label="Description" rows={4} {...description} />
    </>
  );
}
