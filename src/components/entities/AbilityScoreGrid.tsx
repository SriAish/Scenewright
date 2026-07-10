"use client";

import { useState } from "react";
import { AbilityScores } from "@/hooks/useEntities";

const STAT_KEYS: (keyof AbilityScores)[] = ["str", "dex", "con", "int", "wis", "cha"];
const STAT_LABELS: Record<keyof AbilityScores, string> = {
  str: "STR",
  dex: "DEX",
  con: "CON",
  int: "INT",
  wis: "WIS",
  cha: "CHA",
};

type Draft = Record<keyof AbilityScores, string>;

function toDraft(scores?: AbilityScores): Draft {
  return Object.fromEntries(STAT_KEYS.map((key) => [key, scores?.[key] !== undefined ? String(scores[key]) : ""])) as Draft;
}

export interface AbilityScoreGridProps {
  scores?: AbilityScores;
  onCommit: (scores: AbilityScores | undefined) => void;
}

/*
  Six-stat compact grid, shared between NPC and monster detail. Ability
  scores are optional as a group per the build instructions: committed
  only once all six fields hold a valid integer, otherwise the group is
  left out of the save rather than stored partially filled.
*/
export function AbilityScoreGrid({ scores, onCommit }: AbilityScoreGridProps) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(scores));
  // Resync draft from an external scores change during render (React's
  // "adjusting state when a prop changes" pattern), not a useEffect.
  const [syncedScores, setSyncedScores] = useState(scores);

  if (scores !== syncedScores) {
    setSyncedScores(scores);
    setDraft(toDraft(scores));
  }

  function commit() {
    const [str, dex, con, int, wis, cha] = STAT_KEYS.map((key) => Number.parseInt(draft[key], 10));
    const complete = [str, dex, con, int, wis, cha].every((value) => Number.isInteger(value));
    const next = complete ? { str, dex, con, int, wis, cha } : undefined;
    // Skip the round trip while the group is still mid-fill (tabbing
    // through six fields blurs five times before it's complete) and
    // whenever the recomputed value matches what's already saved.
    if (JSON.stringify(next) === JSON.stringify(scores)) return;
    onCommit(next);
  }

  return (
    <div className="grid grid-cols-6 gap-sm">
      {STAT_KEYS.map((key) => (
        <div
          key={key}
          className="flex flex-col items-center gap-[4px] bg-surface-card border border-border-soft rounded-sm py-[10px] px-[6px]"
        >
          <span className="text-micro font-semibold uppercase tracking-wider text-text-label">
            {STAT_LABELS[key]}
          </span>
          <input
            type="number"
            aria-label={STAT_LABELS[key]}
            value={draft[key]}
            onChange={(event) => setDraft((prev) => ({ ...prev, [key]: event.target.value }))}
            onBlur={commit}
            className="w-full text-[17px] font-semibold text-text-primary text-center bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
      ))}
    </div>
  );
}
