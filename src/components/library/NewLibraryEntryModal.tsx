"use client";

import { FormEvent, useState } from "react";
import { Button, EntityIcon, EntityType, Input, ModalChassis, entityColorClasses } from "@/components/ui";

const TYPE_LABEL: Record<EntityType, string> = { npc: "Character", monster: "Monster", item: "Item" };
const TYPES: EntityType[] = ["npc", "monster", "item"];

export interface NewLibraryEntryModalProps {
  onClose: () => void;
  onCreate: (type: EntityType, name: string) => Promise<void>;
}

/**
 * Library's toolbar has one "New entry" button covering all three
 * types (unlike the per-tab NewEntityModal used by campaign entity
 * tabs), so this adds a type picker ahead of the name field.
 */
export function NewLibraryEntryModal({ onClose, onCreate }: NewLibraryEntryModalProps) {
  const [type, setType] = useState<EntityType>("npc");
  const [name, setName] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || isSubmitting) return;
    setSubmitting(true);
    await onCreate(type, name.trim());
  }

  return (
    <ModalChassis
      title="New entry"
      size="small"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-sm">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="new-library-entry-form" variant="primary" disabled={!name.trim() || isSubmitting}>
            {isSubmitting ? "Creating..." : `Create ${TYPE_LABEL[type].toLowerCase()}`}
          </Button>
        </div>
      }
    >
      <form id="new-library-entry-form" onSubmit={handleSubmit} className="flex flex-col gap-base">
        <div className="flex flex-col gap-sm">
          <span className="block text-label font-semibold uppercase tracking-wider text-text-label">Type</span>
          <div className="inline-flex items-center p-[3px] rounded-sm bg-surface-panel gap-[2px] w-fit">
            {TYPES.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setType(option)}
                className={`flex items-center gap-sm px-[14px] py-[6px] rounded-sm text-ui font-medium cursor-pointer transition-colors duration-150 ${
                  type === option
                    ? "bg-surface-card-solid text-text-primary shadow-card"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                <EntityIcon type={option} size={12} className={entityColorClasses[option].text} />
                {TYPE_LABEL[option]}
              </button>
            ))}
          </div>
        </div>
        <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} required autoFocus />
      </form>
    </ModalChassis>
  );
}
