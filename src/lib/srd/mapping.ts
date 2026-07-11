import type { ItemData, MonsterAction, MonsterData } from "@/hooks/useEntities";

/*
  Field-to-field mapping from raw srd_entries data (the verbatim SRD JSON,
  same shape as data/srd/*.json) into the app's per-type entity data shape
  (step 8's zod schemas in api/campaigns/[id]/entities/_shared.ts). Shared
  between the search service (finder result cards) and the fork service
  (srdAdd's entities.data), so the two never drift apart on what a field
  means.

  SRD fields with no matching app field are dropped, not stored anywhere
  else on the entity; the full source stays reachable via srd_source_id.
  No value here is invented: a field absent from the source stays
  undefined in the mapped result.
*/

interface RawArmorClassEntry {
  value?: number;
}

interface RawMonsterAction {
  name?: string;
  desc?: string;
}

interface RawSpeed {
  walk?: string;
  swim?: string;
  fly?: string;
  climb?: string;
  burrow?: string;
}

interface RawMonsterJson {
  armor_class?: RawArmorClassEntry[];
  hit_points?: number;
  speed?: RawSpeed;
  strength?: number;
  dexterity?: number;
  constitution?: number;
  intelligence?: number;
  wisdom?: number;
  charisma?: number;
  actions?: RawMonsterAction[];
  desc?: string;
}

interface RawItemJson {
  desc?: string | string[];
}

/** Filter columns plus the raw jsonb data, the minimal shape every mapper reads. */
export interface SrdMonsterRow {
  cr: string | null;
  monsterType: string | null;
  size: string | null;
  data: unknown;
}

export interface SrdItemRow {
  rarity: string | null;
  category: string | null;
  attunement: boolean | null;
  data: unknown;
}

const SUMMARY_MAX_LENGTH = 200;

/*
  Summary rule (screen 9's two-line picker description): the first
  sentence of the description, cut at the first ". " or end-of-string
  period. If that first sentence is longer than 200 characters, or the
  description has no terminating period at all, truncate to 200
  characters at the last word boundary and append an ellipsis. An
  absent or empty description yields an empty summary, matching manual
  entity creation's summary: "" (no fabricated fallback text).
*/
export function deriveSummary(description: string | undefined): string {
  const trimmed = description?.trim();
  if (!trimmed) return "";

  const sentenceMatch = trimmed.match(/^[^.]*\.(?=\s|$)/);
  const firstSentence = sentenceMatch ? sentenceMatch[0].trim() : undefined;
  if (firstSentence && firstSentence.length <= SUMMARY_MAX_LENGTH) {
    return firstSentence;
  }

  const source = firstSentence ?? trimmed;
  if (source.length <= SUMMARY_MAX_LENGTH) return source;

  const truncated = source.slice(0, SUMMARY_MAX_LENGTH);
  const lastSpace = truncated.lastIndexOf(" ");
  const cut = lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated;
  return `${cut.trim()}…`;
}

function descToText(desc: string | string[] | undefined): string | undefined {
  if (!desc) return undefined;
  const text = Array.isArray(desc) ? desc.join("\n") : desc;
  const trimmed = text.trim();
  return trimmed || undefined;
}

function formatSpeed(speed: RawSpeed | undefined): string | undefined {
  if (!speed) return undefined;
  const entries = Object.entries(speed).filter((entry): entry is [string, string] => typeof entry[1] === "string");
  if (entries.length === 0) return undefined;
  if (entries.length === 1 && entries[0][0] === "walk") return entries[0][1];
  return entries.map(([type, value]) => `${type} ${value}`).join(", ");
}

function hasAllAbilityScores(raw: RawMonsterJson): raw is RawMonsterJson &
  Required<Pick<RawMonsterJson, "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma">> {
  return [raw.strength, raw.dexterity, raw.constitution, raw.intelligence, raw.wisdom, raw.charisma].every(
    (value) => typeof value === "number",
  );
}

function mapActions(raw: RawMonsterAction[] | undefined): MonsterAction[] | undefined {
  const actions = (raw ?? [])
    .filter((action): action is Required<RawMonsterAction> => typeof action.name === "string" && typeof action.desc === "string" && action.desc.length > 0)
    .map((action) => ({ name: action.name, description: action.desc }));
  return actions.length > 0 ? actions : undefined;
}

export function mapMonsterData(entry: SrdMonsterRow): MonsterData {
  const raw = (entry.data ?? {}) as RawMonsterJson;
  const ac = raw.armor_class?.[0]?.value;

  return {
    cr: entry.cr ?? undefined,
    type: entry.monsterType ?? undefined,
    size: entry.size ?? undefined,
    ac: typeof ac === "number" ? ac : undefined,
    hp: typeof raw.hit_points === "number" ? raw.hit_points : undefined,
    speeds: formatSpeed(raw.speed),
    abilities: hasAllAbilityScores(raw)
      ? { str: raw.strength, dex: raw.dexterity, con: raw.constitution, int: raw.intelligence, wis: raw.wisdom, cha: raw.charisma }
      : undefined,
    actions: mapActions(raw.actions),
    description: typeof raw.desc === "string" ? descToText(raw.desc) : undefined,
  };
}

export function mapItemData(entry: SrdItemRow): ItemData {
  const raw = (entry.data ?? {}) as RawItemJson;

  return {
    rarity: entry.rarity ?? undefined,
    category: entry.category ?? undefined,
    attunement: entry.attunement ?? undefined,
    description: descToText(raw.desc),
  };
}

function capitalize(value: string): string {
  return value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

/** "CR 2 · Medium Undead · AC 13 · HP 36", matching the finder result card's key-stats line. */
export function monsterKeyStats(entry: SrdMonsterRow): string {
  const raw = (entry.data ?? {}) as RawMonsterJson;
  const ac = raw.armor_class?.[0]?.value;
  const sizeType = [entry.size, entry.monsterType ? capitalize(entry.monsterType) : undefined].filter(Boolean).join(" ");

  return [
    entry.cr !== null ? `CR ${entry.cr}` : undefined,
    sizeType || undefined,
    typeof ac === "number" ? `AC ${ac}` : undefined,
    typeof raw.hit_points === "number" ? `HP ${raw.hit_points}` : undefined,
  ]
    .filter((segment): segment is string => Boolean(segment))
    .join(" · ");
}

/** "Rare · Weapon · Requires attunement", matching the finder result card's key-stats line. */
export function itemKeyStats(entry: SrdItemRow): string {
  return [
    entry.rarity ?? undefined,
    entry.category ?? undefined,
    entry.attunement === true ? "Requires attunement" : entry.attunement === false ? "No attunement" : undefined,
  ]
    .filter((segment): segment is string => Boolean(segment))
    .join(" · ");
}

/** Result-card description: same derivation rule as the entity summary, over whichever raw desc field the type carries. */
export function srdCardDescription(type: "monster" | "item", data: unknown): string {
  const raw = (data ?? {}) as RawMonsterJson & RawItemJson;
  const description = type === "monster" ? (typeof raw.desc === "string" ? raw.desc.trim() || undefined : undefined) : descToText(raw.desc);
  return deriveSummary(description);
}
