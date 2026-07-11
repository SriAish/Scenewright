"use client";

import { useState } from "react";
import { Button, ModalChassis, RadioOption } from "@/components/ui";

export interface BackstoryReferenceConfirmModalProps {
  entityName: string;
  names: string[];
  onBack: () => void;
  onClose: () => void;
  onConfirm: (mentionStrategy: "flatten" | "copyReferenced") => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

function formatNameList(names: string[]): string {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

/**
 * Screen 12's follow-up confirm step: shared between the import modal
 * and Save-to-library, since both fork operations offer the same
 * flatten-or-copy choice for backstory mentions outside the target
 * scope, per the docs.
 */
export function BackstoryReferenceConfirmModal({
  entityName,
  names,
  onBack,
  onClose,
  onConfirm,
  isSubmitting = false,
  submitLabel = "Import",
}: BackstoryReferenceConfirmModalProps) {
  const [strategy, setStrategy] = useState<"flatten" | "copyReferenced">("flatten");

  return (
    <ModalChassis
      title="Backstory references"
      size="small"
      onClose={onClose}
      footer={
        <div className="flex justify-between gap-sm">
          <Button variant="secondary" onClick={onBack} disabled={isSubmitting}>
            Back
          </Button>
          <Button variant="primary" onClick={() => onConfirm(strategy)} disabled={isSubmitting}>
            {isSubmitting ? "Working..." : submitLabel}
          </Button>
        </div>
      }
    >
      <p className="text-ui text-text-secondary leading-[1.5]">
        {entityName}&rsquo;s backstory mentions {formatNameList(names)}.
      </p>
      <div className="flex flex-col gap-md">
        <RadioOption
          checked={strategy === "copyReferenced"}
          onSelect={() => setStrategy("copyReferenced")}
          label={`Copy referenced entities too (${names.length} cop${names.length === 1 ? "y" : "ies"} will be created)`}
        />
        <RadioOption
          checked={strategy === "flatten"}
          onSelect={() => setStrategy("flatten")}
          label="Flatten references to plain text"
        />
      </div>
    </ModalChassis>
  );
}
