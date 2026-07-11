import { NPCs } from "fantasy-content-generator";
import { rollAbilityScores, type AbilityScores } from "./abilityScores";
import { ALIGNMENTS, type Alignment } from "./tables/alignments";
import { OCCUPATIONS, type Occupation } from "./tables/occupations";
import { formatRaceLabel, type Race, type Sex } from "./valueSets";

/*
  NPC generation service, v1 table backend (build step 10). Emits the
  normalized NPC schema from step 8 (description, personalityTraits,
  abilityScores, relationships, alignmentTendencies) so a later LLM
  backend can swap in behind the same generateNpcCandidates signature.

  Sources: race/sex/personality traits/motivation from
  fantasy-content-generator (MIT); occupation from a GM-authored table;
  alignment read from the vendored SRD data; ability scores rolled
  in-service (the one rule with no library source, see abilityScores.ts).
  No network calls, no campaign-context assembly, no LLM.
*/

export interface GenerateNpcInput {
  race?: Race;
  sex?: Sex;
  alignment?: Alignment;
  occupation?: Occupation;
  /**
   * Carried through but unused in v1: fantasy-content-generator has no
   * mechanism to seed generation from freeform text. Later LLM-backed
   * generation is expected to consume this.
   */
  plotHooks?: string;
}

export interface NpcCandidate {
  name: string;
  description: string;
  personalityTraits: string;
  abilityScores: AbilityScores;
  relationships: string;
  alignmentTendencies: string;
}

export interface GenerateNpcResponse {
  candidates: NpcCandidate[];
  /** Always true in v1 (table backend only); the modal's footnote reads this, not a hardcoded string. */
  generatedOffline: boolean;
}

function pickRandom<T>(values: readonly T[]): T {
  return values[Math.floor(Math.random() * values.length)];
}

function generateOne(input: GenerateNpcInput): NpcCandidate {
  const npc = NPCs.generate({
    race: input.race,
    gender: input.sex,
    // Relationships stay empty for manual entry in v1, per the docs.
    shouldGenerateRelations: false,
  });

  const occupation = input.occupation ?? pickRandom(OCCUPATIONS);
  const alignment = input.alignment ?? pickRandom(ALIGNMENTS);
  const raceLabel = formatRaceLabel(npc.race as Race);

  return {
    name: npc.formattedData.name,
    // Third person, only the generated race and occupation: approved 2026-07-10.
    description: `${raceLabel} ${occupation}.`,
    // Both raw traits plus the motivation string, verbatim, one per line: approved 2026-07-10.
    personalityTraits: [...npc.traits, ...npc.desires].join("\n"),
    abilityScores: rollAbilityScores(),
    relationships: "",
    alignmentTendencies: `Leans ${alignment}.`,
  };
}

const CANDIDATE_COUNT = 3;

export function generateNpcCandidates(input: GenerateNpcInput): GenerateNpcResponse {
  const candidates = Array.from({ length: CANDIDATE_COUNT }, () => generateOne(input));
  return { candidates, generatedOffline: true };
}

export { getGenerationOptions, type GenerationOptions } from "./valueSets";
