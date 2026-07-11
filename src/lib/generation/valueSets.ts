import { ALIGNMENTS } from "./tables/alignments";
import { OCCUPATIONS } from "./tables/occupations";

/*
  Dropdown value sets for the generation modal. Values are always
  fantasy-content-generator's own race keys / the app's approved
  occupation and SRD-derived alignment tables; labels are display-only
  formatting, not new data.
*/

export type Race = "dragonborn" | "dwarf" | "elf" | "gnome" | "halfling" | "human" | "halfOrc" | "halfElf" | "tiefling" | "aelfir";
export type Sex = "male" | "female";

const RACES: Race[] = ["dragonborn", "dwarf", "elf", "gnome", "halfling", "human", "halfOrc", "halfElf", "tiefling", "aelfir"];

/** Mirrors fantasy-content-generator's own Utils.formatRace, which isn't exported for reuse. */
export function formatRaceLabel(race: Race): string {
  if (race === "halfOrc") return "Half-Orc";
  if (race === "halfElf") return "Half-Elf";
  return race.charAt(0).toUpperCase() + race.slice(1);
}

function titleCase(value: string): string {
  return value.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1));
}

export interface Option {
  value: string;
  label: string;
}

export interface GenerationOptions {
  races: Option[];
  sexes: Option[];
  alignments: Option[];
  occupations: Option[];
}

export function getGenerationOptions(): GenerationOptions {
  return {
    races: RACES.map((race) => ({ value: race, label: formatRaceLabel(race) })),
    sexes: [
      { value: "male", label: "Male" },
      { value: "female", label: "Female" },
    ],
    alignments: ALIGNMENTS.map((alignment) => ({ value: alignment, label: titleCase(alignment) })),
    occupations: OCCUPATIONS.map((occupation) => ({ value: occupation, label: occupation })),
  };
}
