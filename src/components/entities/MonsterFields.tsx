"use client";

import { Button, IconButton, PlusIcon, Textarea, TrashIcon } from "@/components/ui";
import { MonsterAction, MonsterData } from "@/hooks/useEntities";
import { AbilityScoreGrid } from "./AbilityScoreGrid";
import { StatTile } from "./StatTile";
import { useDraftField } from "./useDraftField";

export interface MonsterFieldsProps {
  data: MonsterData;
  onCommit: (data: MonsterData) => void;
}

function parseIntOrUndefined(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isInteger(parsed) ? parsed : undefined;
}

/** Monster type-specific fields, screen 9's monster variant. */
export function MonsterFields({ data, onCommit }: MonsterFieldsProps) {
  const description = useDraftField(data.description ?? "", (value) => onCommit({ ...data, description: value }));

  function commitActions(actions: MonsterAction[]) {
    onCommit({ ...data, actions });
  }

  function addAction() {
    commitActions([...(data.actions ?? []), { name: "", description: "" }]);
  }

  function updateAction(index: number, next: MonsterAction) {
    const actions = [...(data.actions ?? [])];
    actions[index] = next;
    commitActions(actions);
  }

  function removeAction(index: number) {
    commitActions((data.actions ?? []).filter((_, i) => i !== index));
  }

  return (
    <>
      <div className="flex flex-col gap-sm">
        <span className="block text-label font-semibold uppercase tracking-wider text-text-label">Statblock</span>
        <div className="grid grid-cols-3 gap-sm">
          <StatTile
            label="CR"
            value={data.cr ?? ""}
            onCommit={(value) => onCommit({ ...data, cr: value || undefined })}
          />
          <StatTile
            label="Type"
            value={data.type ?? ""}
            onCommit={(value) => onCommit({ ...data, type: value || undefined })}
          />
          <StatTile
            label="Size"
            value={data.size ?? ""}
            onCommit={(value) => onCommit({ ...data, size: value || undefined })}
          />
          <StatTile
            label="AC"
            value={data.ac !== undefined ? String(data.ac) : ""}
            onCommit={(value) => onCommit({ ...data, ac: parseIntOrUndefined(value) })}
          />
          <StatTile
            label="HP"
            value={data.hp !== undefined ? String(data.hp) : ""}
            onCommit={(value) => onCommit({ ...data, hp: parseIntOrUndefined(value) })}
          />
          <StatTile
            label="Speed"
            value={data.speeds ?? ""}
            onCommit={(value) => onCommit({ ...data, speeds: value || undefined })}
          />
        </div>
      </div>

      <div className="flex flex-col gap-sm">
        <span className="block text-label font-semibold uppercase tracking-wider text-text-label">
          Ability Scores
        </span>
        <AbilityScoreGrid scores={data.abilities} onCommit={(abilities) => onCommit({ ...data, abilities })} />
      </div>

      <div className="flex flex-col gap-md">
        <span className="block text-label font-semibold uppercase tracking-wider text-text-label">Actions</span>
        {(data.actions ?? []).map((action, index) => (
          <ActionRow
            key={index}
            action={action}
            onChange={(next) => updateAction(index, next)}
            onRemove={() => removeAction(index)}
          />
        ))}
        <Button variant="secondary" size="sm" onClick={addAction} className="self-start">
          <PlusIcon />
          Add action
        </Button>
      </div>

      <Textarea label="Description" rows={3} {...description} />
    </>
  );
}

function ActionRow({
  action,
  onChange,
  onRemove,
}: {
  action: MonsterAction;
  onChange: (action: MonsterAction) => void;
  onRemove: () => void;
}) {
  const name = useDraftField(action.name, (value) => onChange({ ...action, name: value }));
  const description = useDraftField(action.description, (value) => onChange({ ...action, description: value }));

  return (
    <div className="flex flex-col gap-sm border border-border-soft rounded-lg p-md bg-surface-card">
      <div className="flex items-center gap-sm">
        <input
          {...name}
          placeholder="Action name"
          className="flex-1 text-content font-semibold text-text-primary bg-transparent outline-none"
        />
        <IconButton label="Remove action" onClick={onRemove}>
          <TrashIcon />
        </IconButton>
      </div>
      <textarea
        {...description}
        placeholder="What this action does"
        rows={2}
        className="w-full font-ui text-ui text-text-primary bg-transparent outline-none resize-none"
      />
    </div>
  );
}
