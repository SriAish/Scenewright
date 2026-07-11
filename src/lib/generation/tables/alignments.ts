import { readFileSync } from "node:fs";

/*
  Alignment table, sourced from data/srd/5e-SRD-Monsters.json rather than
  composed by hand: the nine standard alignments plus "unaligned" are
  read directly out of the vendored SRD file's alignment field ("any X
  alignment" and split-probability entries like "neutral good (50%) or
  neutral evil (50%)" are compound descriptors, not standalone
  alignments, and are filtered out). CANONICAL_ORDER only decides
  display order; every value in it must still be found verbatim in the
  SRD file or it's dropped, so nothing here can drift from source.
*/

const CANONICAL_ORDER = [
  "lawful good",
  "neutral good",
  "chaotic good",
  "lawful neutral",
  "neutral",
  "chaotic neutral",
  "lawful evil",
  "neutral evil",
  "chaotic evil",
  "unaligned",
] as const;

interface MonsterAlignmentRecord {
  alignment?: string;
}

function readSrdAlignments(): Set<string> {
  const path = new URL("../../../../data/srd/5e-SRD-Monsters.json", import.meta.url);
  const monsters = JSON.parse(readFileSync(path, "utf-8")) as MonsterAlignmentRecord[];
  return new Set(monsters.map((m) => m.alignment).filter((a): a is string => typeof a === "string"));
}

const srdAlignments = readSrdAlignments();

export const ALIGNMENTS = CANONICAL_ORDER.filter((alignment) => srdAlignments.has(alignment));

export type Alignment = (typeof ALIGNMENTS)[number];
