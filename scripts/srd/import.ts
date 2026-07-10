/*
  SRD import script. Reads the vendored 2014 SRD files in data/srd/ and
  upserts them into srd_entries, keyed on (type, name). Re-runnable:
  running it again produces the same rows, no duplicates, no errors.

  Run with: npx tsx scripts/srd/import.ts

  Does not touch the embedding column. Run scripts/srd/embed.ts
  afterward to populate embeddings for new or changed rows.
*/

import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { getDb } from "../../src/db";
import { srdEntries } from "../../src/db/schema";

process.loadEnvFile(".env.local");

const DATA_DIR = new URL("../../data/srd/", import.meta.url);

interface NamedDesc {
  name?: string;
  desc?: string;
}

interface MonsterRecord {
  name: string;
  size?: string;
  type?: string;
  alignment?: string;
  challenge_rating?: number;
  special_abilities?: NamedDesc[];
  actions?: NamedDesc[];
  legendary_actions?: NamedDesc[];
  [key: string]: unknown;
}

interface EquipmentCategory {
  name?: string;
}

interface Rarity {
  name?: string;
}

interface ItemRecord {
  name: string;
  equipment_category?: EquipmentCategory;
  rarity?: Rarity;
  variant?: boolean;
  index?: string;
  desc?: string | string[];
  [key: string]: unknown;
}

type ItemSource = "equipment" | "magic-item";

interface SrdEntryRow {
  type: "monster" | "item";
  name: string;
  data: unknown;
  searchText: string;
  cr: string | null;
  monsterType: string | null;
  size: string | null;
  environment: string[] | null;
  alignment: string | null;
  rarity: string | null;
  category: string | null;
  attunement: boolean | null;
}

interface RunAnomaly {
  name: string;
  issue: string;
}

const anomalies: RunAnomaly[] = [];

function readJsonFile<T>(filename: string): T[] {
  const path = new URL(filename, DATA_DIR);
  const raw = readFileSync(path, "utf-8");
  return JSON.parse(raw) as T[];
}

function descToText(desc: string | string[] | undefined): string | null {
  if (!desc) return null;
  if (Array.isArray(desc)) return desc.join("\n");
  return desc;
}

function monsterSearchText(m: MonsterRecord): string {
  const lines: string[] = [m.name];
  if (m.size && m.type && m.alignment) {
    lines.push(`${m.size} ${m.type}, ${m.alignment}.`);
  }
  const sections = [
    ...(m.special_abilities ?? []),
    ...(m.actions ?? []),
    ...(m.legendary_actions ?? []),
  ];
  for (const section of sections) {
    if (section.name && section.desc) {
      lines.push(`${section.name}: ${section.desc}`);
    }
  }
  return lines.join("\n");
}

function itemSearchText(item: ItemRecord): string {
  const descText = descToText(item.desc);
  return descText ? `${item.name}\n${descText}` : item.name;
}

// Magic items open with a structured header line, e.g. "Wondrous item,
// rare (requires attunement by a wizard)". The marker is extracted from
// that header line only (desc[0]), not the whole desc array: one item
// (Hammer of Thunderbolts) mentions "Requires Attunement" deeper in its
// body text for a conditional bonus effect, which is not the same thing
// as the item itself requiring attunement. Per the resolved decision,
// only the header line counts.
const ATTUNEMENT_MARKER = /requires attunement/i;

function magicItemRequiresAttunement(item: ItemRecord): boolean {
  const header = Array.isArray(item.desc) ? item.desc[0] : undefined;
  return typeof header === "string" && ATTUNEMENT_MARKER.test(header);
}

function mapMonster(m: MonsterRecord): SrdEntryRow {
  const hasCr = typeof m.challenge_rating === "number";
  const hasType = typeof m.type === "string" && m.type.length > 0;
  const hasSize = typeof m.size === "string" && m.size.length > 0;
  const hasAlignment = typeof m.alignment === "string" && m.alignment.length > 0;

  if (!hasCr) anomalies.push({ name: m.name, issue: "missing or malformed challenge_rating" });
  if (!hasType) anomalies.push({ name: m.name, issue: "missing or malformed type" });
  if (!hasSize) anomalies.push({ name: m.name, issue: "missing or malformed size" });
  if (!hasAlignment) anomalies.push({ name: m.name, issue: "missing or malformed alignment" });

  return {
    type: "monster",
    name: m.name,
    data: m,
    searchText: monsterSearchText(m),
    cr: hasCr ? String(m.challenge_rating) : null,
    monsterType: hasType ? (m.type as string) : null,
    size: hasSize ? (m.size as string) : null,
    environment: null, // never present in this source; never inferred
    alignment: hasAlignment ? (m.alignment as string) : null,
    rarity: null,
    category: null,
    attunement: null,
  };
}

function mapItem(item: ItemRecord, source: ItemSource): SrdEntryRow {
  const categoryName = item.equipment_category?.name;
  const hasCategory = typeof categoryName === "string" && categoryName.length > 0;
  if (!hasCategory) anomalies.push({ name: item.name, issue: "missing or malformed equipment_category" });

  const rarityName = item.rarity?.name;
  const hasRarity = typeof rarityName === "string" && rarityName.length > 0;
  if (item.rarity !== undefined && !hasRarity) {
    anomalies.push({ name: item.name, issue: "malformed rarity" });
  }

  return {
    type: "item",
    name: item.name,
    data: item,
    searchText: itemSearchText(item),
    cr: null,
    monsterType: null,
    size: null,
    environment: null,
    alignment: null,
    rarity: hasRarity ? (rarityName as string) : null,
    category: hasCategory ? (categoryName as string) : null,
    // Mundane equipment: the concept doesn't apply and the source
    // carries no such field, so this stays null, not a guessed default.
    // Magic items: extracted from the desc[0] header marker, always
    // true or false, never null (see magicItemRequiresAttunement).
    attunement: source === "magic-item" ? magicItemRequiresAttunement(item) : null,
  };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function upsertRows(rows: SrdEntryRow[]) {
  const db = getDb();
  for (const batch of chunk(rows, 100)) {
    await db
      .insert(srdEntries)
      .values(batch)
      .onConflictDoUpdate({
        target: [srdEntries.type, srdEntries.name],
        set: {
          data: sql`excluded.data`,
          searchText: sql`excluded.search_text`,
          cr: sql`excluded.cr`,
          monsterType: sql`excluded.monster_type`,
          size: sql`excluded.size`,
          // environment is intentionally excluded: the source never
          // populates it, and it is hand-edited directly in the
          // database, so a re-import must never overwrite it.
          alignment: sql`excluded.alignment`,
          rarity: sql`excluded.rarity`,
          category: sql`excluded.category`,
          attunement: sql`excluded.attunement`,
        },
      });
  }
}

async function main() {
  const monsters = readJsonFile<MonsterRecord>("5e-SRD-Monsters.json");
  const equipment = readJsonFile<ItemRecord>("5e-SRD-Equipment.json");
  const magicItems = readJsonFile<ItemRecord>("5e-SRD-Magic-Items.json");

  console.log(`Source counts: ${monsters.length} monsters, ${equipment.length} equipment, ${magicItems.length} magic items`);

  // Known collision: the "Potion of Healing" variant-group record and its
  // common-tier child record (index potion-of-healing-common) both carry
  // the exact name "Potion of Healing". Keep the group record, skip the
  // child, per the resolved decision recorded in data/srd/PROVENANCE.md.
  const skipped: string[] = [];
  const magicItemsFiltered = magicItems.filter((item) => {
    if (item.index === "potion-of-healing-common") {
      skipped.push(`${item.name} (index: ${item.index}) skipped: duplicate name of its variant-group parent`);
      return false;
    }
    return true;
  });

  const monsterRows = monsters.map(mapMonster);
  const equipmentRows = equipment.map((item) => mapItem(item, "equipment"));
  const magicItemRows = magicItemsFiltered.map((item) => mapItem(item, "magic-item"));

  await upsertRows(monsterRows);
  await upsertRows(equipmentRows);
  await upsertRows(magicItemRows);

  console.log("\nRun summary");
  console.log("-----------");
  console.log(`Monsters upserted: ${monsterRows.length}`);
  console.log(`Equipment upserted: ${equipmentRows.length}`);
  console.log(`Magic items upserted: ${magicItemRows.length} (of ${magicItems.length} source records)`);
  console.log(`Skipped: ${skipped.length}`);
  skipped.forEach((s) => console.log(`  - ${s}`));
  console.log(`Anomalies (missing or malformed fields, left null): ${anomalies.length}`);
  anomalies.forEach((a) => console.log(`  - ${a.name}: ${a.issue}`));

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
