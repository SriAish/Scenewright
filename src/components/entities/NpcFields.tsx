"use client";

import dynamic from "next/dynamic";
import { Input, Textarea } from "@/components/ui";
import { EntityScope, NpcData } from "@/hooks/useEntities";
import { AbilityScoreGrid } from "./AbilityScoreGrid";
import { useDraftField } from "./useDraftField";

/*
  Dynamically imported so Tiptap only loads for routes that need it, per
  architecture.md's performance configuration. Same pattern as
  SceneEditor and NotesTab.
*/
const MentionEditor = dynamic(() => import("@/components/editor/MentionEditor").then((mod) => mod.MentionEditor), {
  ssr: false,
  loading: () => <div className="text-ui text-text-secondary px-lg py-base">Loading editor...</div>,
});

export interface NpcFieldsProps {
  data: NpcData;
  onCommit: (data: NpcData) => void;
  scope: EntityScope;
  backstoryJson: unknown;
  onBackstorySave: (doc: unknown) => void;
}

/** NPC type-specific fields, screen 9's NPC variant. */
export function NpcFields({ data, onCommit, scope, backstoryJson, onBackstorySave }: NpcFieldsProps) {
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
      <MentionEditor
        label="Backstory"
        scope={scope}
        value={backstoryJson}
        placeholder="Write their history. Type @ to mention a character, monster, or item…"
        onSave={onBackstorySave}
      />
    </>
  );
}
