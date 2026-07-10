"use client";

import { FormEvent, useState } from "react";
import { Button, Input, ModalChassis } from "@/components/ui";

export interface NewSceneModalProps {
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}

/*
  Screen 5's frame does not show a default-name convention for a
  freshly created scene (its example rows are all fully authored), so
  this prompts for a name instead, per the build instructions' fallback.
*/
export function NewSceneModal({ onClose, onCreate }: NewSceneModalProps) {
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
      title="New scene"
      size="small"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-sm">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="new-scene-form" variant="primary" disabled={!name.trim() || isSubmitting}>
            {isSubmitting ? "Creating..." : "Create scene"}
          </Button>
        </div>
      }
    >
      <form id="new-scene-form" onSubmit={handleSubmit}>
        <Input
          label="Scene name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          autoFocus
        />
      </form>
    </ModalChassis>
  );
}
