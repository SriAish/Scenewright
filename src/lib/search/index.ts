import { and, asc, eq, gte, isNotNull, lte, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { srdEntries } from "@/db/schema";
import { embedQuery } from "./embedder";

/*
  Search service, per docs/architecture.md's "Search service" and
  "Monster/item search" call flow: structured filters as SQL WHERE on
  srd_entries filter columns, then (if there's a prose query) embed it
  and rank survivors by pgvector cosine similarity, then top N. No LLM
  re-ranking (explicitly dropped per features-and-decisions.md).
*/

export type SrdType = "monster" | "item";

export interface MonsterFilters {
  crMin?: number;
  crMax?: number;
  monsterType?: string;
  size?: string;
  environment?: string;
  alignment?: string;
}

export interface ItemFilters {
  rarity?: string;
  category?: string;
  attunement?: boolean;
}

export type SrdFilters = MonsterFilters | ItemFilters;

export interface SrdSearchRow {
  id: string;
  type: string;
  name: string;
  data: unknown;
  cr: string | null;
  monsterType: string | null;
  size: string | null;
  environment: string[] | null;
  alignment: string | null;
  rarity: string | null;
  category: string | null;
  attunement: boolean | null;
}

export interface SrdResultPage {
  results: SrdSearchRow[];
  hasMore: boolean;
}

export interface FilterOptions {
  monsterType?: string[];
  size?: string[];
  alignment?: string[];
  environment?: string[];
  rarity?: string[];
  category?: string[];
}

const DEFAULT_TOP_LIMIT = 3;
const DEFAULT_BROWSE_PAGE_SIZE = 20;

const SELECT_COLUMNS = {
  id: srdEntries.id,
  type: srdEntries.type,
  name: srdEntries.name,
  data: srdEntries.data,
  cr: srdEntries.cr,
  monsterType: srdEntries.monsterType,
  size: srdEntries.size,
  environment: srdEntries.environment,
  alignment: srdEntries.alignment,
  rarity: srdEntries.rarity,
  category: srdEntries.category,
  attunement: srdEntries.attunement,
};

function buildConditions(type: SrdType, filters: SrdFilters | undefined): SQL[] {
  const conditions: SQL[] = [eq(srdEntries.type, type)];

  if (type === "monster") {
    const f = (filters ?? {}) as MonsterFilters;
    if (f.crMin !== undefined) conditions.push(gte(srdEntries.cr, String(f.crMin)));
    if (f.crMax !== undefined) conditions.push(lte(srdEntries.cr, String(f.crMax)));
    if (f.monsterType) conditions.push(eq(srdEntries.monsterType, f.monsterType));
    if (f.size) conditions.push(eq(srdEntries.size, f.size));
    if (f.alignment) conditions.push(eq(srdEntries.alignment, f.alignment));
    // Environment values are sparse and hand-curated (per build brief); a
    // selection simply matches whatever rows happen to carry it, no
    // special-casing for the mostly-null column.
    if (f.environment) conditions.push(sql`${srdEntries.environment} @> ARRAY[${f.environment}]::text[]`);
  } else {
    const f = (filters ?? {}) as ItemFilters;
    if (f.rarity) conditions.push(eq(srdEntries.rarity, f.rarity));
    if (f.category) conditions.push(eq(srdEntries.category, f.category));
    if (f.attunement !== undefined) conditions.push(eq(srdEntries.attunement, f.attunement));
  }

  return conditions;
}

function hasAnyFilter(type: SrdType, filters: SrdFilters | undefined): boolean {
  if (!filters) return false;
  if (type === "monster") {
    const f = filters as MonsterFilters;
    return (
      f.crMin !== undefined || f.crMax !== undefined || Boolean(f.monsterType) || Boolean(f.size) || Boolean(f.alignment) || Boolean(f.environment)
    );
  }
  const f = filters as ItemFilters;
  return Boolean(f.rarity) || Boolean(f.category) || f.attunement !== undefined;
}

export interface SearchParams {
  type: SrdType;
  filters?: SrdFilters;
  prose?: string;
  limit?: number;
}

/**
 * Top-N ranked search: filter-then-rank. Prose query empty returns filter
 * survivors alphabetically (no embedding call). Both prose and filters
 * empty returns nothing, matching the finder's pre-search state so the
 * modal never has to special-case an empty query client-side.
 */
export async function searchSrdEntries(params: SearchParams): Promise<SrdResultPage> {
  const prose = params.prose?.trim() ?? "";
  const limit = params.limit ?? DEFAULT_TOP_LIMIT;
  const hasProse = prose.length > 0;

  if (!hasProse && !hasAnyFilter(params.type, params.filters)) {
    return { results: [], hasMore: false };
  }

  const db = getDb();
  const conditions = buildConditions(params.type, params.filters);

  if (!hasProse) {
    const rows = await db
      .select(SELECT_COLUMNS)
      .from(srdEntries)
      .where(and(...conditions))
      .orderBy(asc(srdEntries.name))
      .limit(limit + 1);
    return { results: rows.slice(0, limit), hasMore: rows.length > limit };
  }

  // Rows without an embedding yet (between import and precompute) can't be
  // ranked meaningfully; exclude them from prose-ranked results.
  conditions.push(isNotNull(srdEntries.embedding));
  const vector = await embedQuery(prose);
  const vectorLiteral = `[${vector.join(",")}]`;

  const rows = await db
    .select(SELECT_COLUMNS)
    .from(srdEntries)
    .where(and(...conditions))
    .orderBy(sql`${srdEntries.embedding} <=> ${vectorLiteral}::vector`)
    .limit(limit + 1);
  return { results: rows.slice(0, limit), hasMore: rows.length > limit };
}

export interface BrowseParams {
  type: SrdType;
  filters?: SrdFilters;
  page?: number;
  pageSize?: number;
}

/** Browse mode: alphabetical, paginated, still respecting whatever filters are set. */
export async function browseSrdEntries(params: BrowseParams): Promise<SrdResultPage> {
  const db = getDb();
  const conditions = buildConditions(params.type, params.filters);
  const pageSize = params.pageSize ?? DEFAULT_BROWSE_PAGE_SIZE;
  const page = params.page ?? 1;

  const rows = await db
    .select(SELECT_COLUMNS)
    .from(srdEntries)
    .where(and(...conditions))
    .orderBy(asc(srdEntries.name))
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize);
  return { results: rows.slice(0, pageSize), hasMore: rows.length > pageSize };
}

/**
 * Distinct values actually present in srd_entries for each filter's
 * dropdown, rather than an invented fixed taxonomy (no rarity/category/
 * type/alignment enum is specified anywhere in the docs). Mirrors the
 * "environment simply matches what exists" rule for every filter, not
 * just environment.
 */
export async function getFilterOptions(type: SrdType): Promise<FilterOptions> {
  const db = getDb();

  if (type === "monster") {
    const [monsterTypes, sizes, alignments, environments] = await Promise.all([
      db
        .selectDistinct({ value: srdEntries.monsterType })
        .from(srdEntries)
        .where(and(eq(srdEntries.type, "monster"), isNotNull(srdEntries.monsterType)))
        .orderBy(asc(srdEntries.monsterType)),
      db
        .selectDistinct({ value: srdEntries.size })
        .from(srdEntries)
        .where(and(eq(srdEntries.type, "monster"), isNotNull(srdEntries.size)))
        .orderBy(asc(srdEntries.size)),
      db
        .selectDistinct({ value: srdEntries.alignment })
        .from(srdEntries)
        .where(and(eq(srdEntries.type, "monster"), isNotNull(srdEntries.alignment)))
        .orderBy(asc(srdEntries.alignment)),
      db.execute<{ value: string }>(
        sql`select distinct unnest(${srdEntries.environment}) as value from ${srdEntries} where ${srdEntries.type} = 'monster' and ${srdEntries.environment} is not null order by 1`,
      ),
    ]);
    return {
      monsterType: monsterTypes.map((row) => row.value as string),
      size: sizes.map((row) => row.value as string),
      alignment: alignments.map((row) => row.value as string),
      environment: Array.from(environments).map((row) => row.value),
    };
  }

  const [rarities, categories] = await Promise.all([
    db
      .selectDistinct({ value: srdEntries.rarity })
      .from(srdEntries)
      .where(and(eq(srdEntries.type, "item"), isNotNull(srdEntries.rarity)))
      .orderBy(asc(srdEntries.rarity)),
    db
      .selectDistinct({ value: srdEntries.category })
      .from(srdEntries)
      .where(and(eq(srdEntries.type, "item"), isNotNull(srdEntries.category)))
      .orderBy(asc(srdEntries.category)),
  ]);
  return {
    rarity: rarities.map((row) => row.value as string),
    category: categories.map((row) => row.value as string),
  };
}
