"use client";

import { Input, Textarea } from "@/components/ui";
import { NpcData } from "@/hooks/useEntities";
import { AbilityScoreGrid } from "./AbilityScoreGrid";
import { useDraftField } from "./useDraftField";

export interface NpcFieldsProps {
  data: NpcData;
  onCommit: (data: NpcData) => void;
  backstoryText: string;
  backstoryEditable: boolean;
  onBackstoryChange: (text: string) => void;
  onBackstoryBlur: () => void;
}

/** NPC type-specific fields, screen 9's NPC variant. */
export function NpcFields({
  data,
  onCommit,
  backstoryText,
  backstoryEditable,
  onBackstoryChange,
  onBackstoryBlur,
}: NpcFieldsProps) {
  const description = useDraftField(data.description ?? "", (value) => onCommit({ ...data, description: value }));
  const personalityTraits = useDraftField(data.personalityTraits ?? "", (value) =>
    onCommit({ ...data, personalityTraits: value }),
  );
  const relationships = useDraftField(data.relationships ?? "", (value) => onCommit({ ...data, relationships: value }));
  const alignmentTendencies = useDraftField(data.alignmentTendencies ?? "", (value) =>
    onCommit({ ...data, alignmentTendencies: value }),
  );

  return (
    <>
      <Textarea label="Description" rows={3} {...description} />
      <Textarea label="Personality Traits" rows={3} {...personalityTraits} />
      <div className="flex flex-col gap-sm">
        <span className="block text-label font-semibold uppercase tracking-wider text-text-label">
          Ability Scores
        </span>
        <AbilityScoreGrid
          scores={data.abilityScores}
          onCommit={(scores) => onCommit({ ...data, abilityScores: scores })}
        />
      </div>
      <Textarea label="Relationships" rows={3} {...relationships} />
      <Input label="Alignment Tendencies" {...alignmentTendencies} />
      <div className="flex flex-col gap-sm">
        <span className="block text-label font-semibold uppercase tracking-wider text-text-label">Backstory</span>
        {backstoryEditable ? (
          <textarea
            value={backstoryText}
            onChange={(event) => onBackstoryChange(event.target.value)}
            onBlur={onBackstoryBlur}
            rows={6}
            className="w-full font-ui text-content text-text-primary bg-surface-card border border-border-soft rounded-lg px-lg py-base outline-none resize-none"
          />
        ) : (
          <div className="text-ui text-text-secondary bg-surface-card border border-border-soft rounded-lg px-lg py-base">
            This field has content this plain-text stand-in cannot display safely. It is left
            untouched here; edit it once the full mention-enabled backstory editor is available.
          </div>
        )}
      </div>
    </>
  );
}
