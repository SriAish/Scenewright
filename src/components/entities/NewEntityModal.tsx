"use client";

import { FormEvent, useState } from "react";
import { Button, EntityType, Input, ModalChassis } from "@/components/ui";

const TYPE_LABEL: Record<EntityType, string> = { npc: "character", monster: "monster", item: "item" };

export interface NewEntityModalProps {
  type: EntityType;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}

/*
  Manual entity creation: name only, matching NewSceneModal's pattern.
  Summary and type-specific fields are filled in on the entity detail
  page afterward, edit-in-place.
*/
export function NewEntityModal({ type, onClose, onCreate }: NewEntityModalProps) {
  const label = TYPE_LABEL[type];
  const [name, setName] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || isSubmitting) return;
    setSubmitting(true);
    await onCreate(name.trim());
  }

  return (
    <ModalChassis
      title={`New ${label}`}
      size="small"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-sm">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="new-entity-form" variant="primary" disabled={!name.trim() || isSubmitting}>
            {isSubmitting ? "Creating..." : `Create ${label}`}
          </Button>
        </div>
      }
    >
      <form id="new-entity-form" onSubmit={handleSubmit}>
        <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} required autoFocus />
      </form>
    </ModalChassis>
  );
}
