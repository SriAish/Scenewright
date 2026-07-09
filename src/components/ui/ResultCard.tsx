import { ReactNode } from "react";
import { Button } from "./Button";

export interface CandidateCardChassisProps {
  layout: "row" | "column";
  children: ReactNode;
  className?: string;
}

/**
 * Shared chassis for the finder result card and the NPC generation
 * candidate card: same surface, border, radius, padding, and hover
 * treatment (source: .modal-result-card / .gen-cand-card, identical
 * styling between the two).
 */
export function CandidateCardChassis({ layout, children, className }: CandidateCardChassisProps) {
  return (
    <div
      className={`bg-surface-card-solid border border-border-default rounded-md py-md px-base transition-colors duration-150 hover:bg-surface-panel hover:shadow-card ${layout === "row" ? "flex items-center gap-md" : "flex flex-col gap-sm"} ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

export interface FinderResultCardProps {
  name: string;
  keyStats: string;
  description: string;
  onAdd: () => void;
  addLabel?: string;
}

/** Monster/item finder result row: name, key-stats line, description, Add to campaign. */
export function FinderResultCard({ name, keyStats, description, onAdd, addLabel = "Add to campaign" }: FinderResultCardProps) {
  return (
    <CandidateCardChassis layout="row">
      <div className="min-w-0 flex-1">
        <div className="text-content font-semibold text-text-primary">{name}</div>
        <div className="text-micro text-text-secondary mt-[2px]">{keyStats}</div>
        <div className="text-ui text-text-secondary mt-[4px] line-clamp-2">{description}</div>
      </div>
      <Button variant="secondary" size="sm" onClick={onAdd} className="shrink-0">
        {addLabel}
      </Button>
    </CandidateCardChassis>
  );
}

export interface AbilityScore {
  label: string;
  value: string;
}

export interface GenerationCandidateCardProps {
  name: string;
  descriptionExcerpt: string;
  personalityTraits: string;
  abilityScores: AbilityScore[];
  alignmentTendency: string;
  onUse: () => void;
  useLabel?: string;
}

/** NPC generation candidate card: name, description, traits, ability strip, alignment, Use this one. */
export function GenerationCandidateCard({
  name,
  descriptionExcerpt,
  personalityTraits,
  abilityScores,
  alignmentTendency,
  onUse,
  useLabel = "Use this one",
}: GenerationCandidateCardProps) {
  return (
    <CandidateCardChassis layout="column">
      <div className="text-content font-semibold text-text-primary">{name}</div>
      <div className="text-ui text-text-secondary line-clamp-2">{descriptionExcerpt}</div>
      <div className="text-micro text-text-secondary">{personalityTraits}</div>
      <div className="flex gap-sm">
        {abilityScores.map((score) => (
          <div key={score.label} className="flex flex-col items-center flex-1 bg-surface-card rounded-sm py-[4px]">
            <span className="text-micro font-medium uppercase tracking-wider text-text-label">{score.label}</span>
            <span className="text-ui text-text-primary">{score.value}</span>
          </div>
        ))}
      </div>
      <div className="text-micro text-text-secondary">{alignmentTendency}</div>
      <Button variant="primary" size="sm" onClick={onUse}>
        {useLabel}
      </Button>
    </CandidateCardChassis>
  );
}
