"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, GenerationCandidateCard, Input, ModalChassis, Textarea } from "@/components/ui";
import { useCreateEntity } from "@/hooks/useCreateEntity";
import { useUpdateEntity } from "@/hooks/useUpdateEntity";
import { campaignScope } from "@/hooks/useEntities";
import { GenerateNpcsResponse, NpcCandidate, useGenerateNpcs } from "@/hooks/useGenerateNpcs";
import { useNpcGenerationOptions } from "@/hooks/useNpcGenerationOptions";
import { LabeledSelect } from "./LabeledSelect";

export interface NpcGenerationModalProps {
  campaignId: string;
  onClose: () => void;
}

/**
 * NPC generation, screen 10. V1 table backend only: no LLM, no
 * campaign-context assembly. The freeform steering box is a disabled
 * placeholder for the later context-aware backend.
 */
export function NpcGenerationModal({ campaignId, onClose }: NpcGenerationModalProps) {
  const { data: options } = useNpcGenerationOptions();
  const generate = useGenerateNpcs();
  const scope = campaignScope(campaignId);
  const createEntity = useCreateEntity(scope, "npc");
  const updateEntity = useUpdateEntity(scope, "npc");
  const router = useRouter();

  const [race, setRace] = useState<string | undefined>(undefined);
  const [sex, setSex] = useState<string | undefined>(undefined);
  const [alignment, setAlignment] = useState<string | undefined>(undefined);
  const [occupation, setOccupation] = useState<string | undefined>(undefined);
  const [plotHooks, setPlotHooks] = useState("");
  const [result, setResult] = useState<GenerateNpcsResponse | null>(null);
  const [usingIndex, setUsingIndex] = useState<number | null>(null);

  async function handleGenerate() {
    const response = await generate.mutateAsync({ race, sex, alignment, occupation, plotHooks });
    setResult(response);
  }

  async function handleUse(candidate: NpcCandidate, index: number) {
    setUsingIndex(index);
    try {
      const created = await createEntity.mutateAsync({ name: candidate.name });
      await updateEntity.mutateAsync({
        id: created.id,
        summary: candidate.description,
        data: {
          description: candidate.description,
          personalityTraits: candidate.personalityTraits,
          abilityScores: candidate.abilityScores,
          relationships: candidate.relationships,
          alignmentTendencies: candidate.alignmentTendencies,
        },
      });
      router.push(`/campaigns/${campaignId}/entities/${created.id}`);
    } finally {
      setUsingIndex(null);
    }
  }

  return (
    <ModalChassis title="Generate a character" size="two-panel" onClose={onClose}>
      <div className="w-[250px] shrink-0 flex flex-col gap-md">
        <LabeledSelect label="Race" value={race} options={options?.races ?? []} onChange={setRace} />
        <LabeledSelect label="Sex" value={sex} options={options?.sexes ?? []} onChange={setSex} />
        <LabeledSelect label="Alignment" value={alignment} options={options?.alignments ?? []} onChange={setAlignment} />
        <LabeledSelect label="Occupation" value={occupation} options={options?.occupations ?? []} onChange={setOccupation} />
        <Input label="Plot hooks" value={plotHooks} onChange={(event) => setPlotHooks(event.target.value)} placeholder="e.g. owes the party a debt" />
        <div title="Context-aware generation is coming later. Temporary: disabled in this build step.">
          <Textarea label="Anything else the generator should know" rows={2} disabled placeholder="Coming later" />
        </div>
        <Button variant="primary" onClick={handleGenerate} disabled={generate.isPending} className="mt-[4px] w-full">
          {generate.isPending ? "Generating..." : "Generate"}
        </Button>
        {result?.generatedOffline && (
          <div className="flex items-center gap-sm text-micro text-text-placeholder">Generated offline, relationships left blank</div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-md">
        {!result ? (
          <div className="flex-1 flex items-center justify-center min-h-[340px]">
            <span className="text-[13.5px] text-text-placeholder text-center max-w-[260px]">
              Set your constraints and generate three candidates.
            </span>
          </div>
        ) : (
          <>
            {result.candidates.map((candidate, index) => (
              <GenerationCandidateCard
                key={`${candidate.name}-${index}`}
                name={candidate.name}
                descriptionExcerpt={candidate.description}
                personalityTraits={candidate.personalityTraits}
                abilityScores={[
                  { label: "STR", value: String(candidate.abilityScores.str) },
                  { label: "DEX", value: String(candidate.abilityScores.dex) },
                  { label: "CON", value: String(candidate.abilityScores.con) },
                  { label: "INT", value: String(candidate.abilityScores.int) },
                  { label: "WIS", value: String(candidate.abilityScores.wis) },
                  { label: "CHA", value: String(candidate.abilityScores.cha) },
                ]}
                alignmentTendency={candidate.alignmentTendencies}
                onUse={() => handleUse(candidate, index)}
                useLabel={usingIndex === index ? "Adding..." : "Use this one"}
              />
            ))}
            <div className="flex justify-center mt-[4px]">
              <Button variant="secondary" onClick={handleGenerate} disabled={generate.isPending}>
                Reroll all
              </Button>
            </div>
          </>
        )}
      </div>
    </ModalChassis>
  );
}
