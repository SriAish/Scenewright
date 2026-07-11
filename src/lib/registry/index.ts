import { and, eq, isNull, or } from "drizzle-orm";
import { getDb } from "@/db";
import { campaigns, entities, srdEntries } from "@/db/schema";
import type { EntityType } from "@/lib/entities/schemas";

/*
  Lineage registry: browse/search all of a user's entities across
  campaigns and the library, grouped by effective root (coalesce
  lineage_root_id, id), per features-and-decisions.md section 5.3. One
  query module reused by the import modal (screen 12) today and any
  future registry-browse screen, per architecture.md.
*/

export interface RegistryVariant {
  id: string;
  name: string;
  summary: string;
  type: EntityType;
  /** "Library" or the source campaign's title. */
  sourceLabel: string;
  campaignId: string | null;
  isDeletedCampaign: boolean;
}

export interface RegistryGroup {
  effectiveRootId: string;
  type: EntityType;
  headerName: string;
  headerSummary: string;
  versionCount: number;
  variants: RegistryVariant[];
}

export interface SearchRegistryParams {
  userId: string;
  type?: EntityType;
  query?: string;
  includeDeletedCampaigns: boolean;
  /** Import modal excludes the target campaign's own entities ("import from my OTHER campaigns"). */
  excludeCampaignId?: string;
}

interface RegistryRow {
  id: string;
  name: string;
  summary: string;
  type: string;
  campaignId: string | null;
  lineageRootId: string | null;
  createdAt: Date;
  campaignTitle: string | null;
  campaignDeletedAt: Date | null;
}

export async function searchRegistry(params: SearchRegistryParams): Promise<RegistryGroup[]> {
  const db = getDb();

  const rows: RegistryRow[] = await db
    .select({
      id: entities.id,
      name: entities.name,
      summary: entities.summary,
      type: entities.type,
      campaignId: entities.campaignId,
      lineageRootId: entities.lineageRootId,
      createdAt: entities.createdAt,
      campaignTitle: campaigns.title,
      campaignDeletedAt: campaigns.deletedAt,
    })
    .from(entities)
    .leftJoin(campaigns, eq(entities.campaignId, campaigns.id))
    .where(
      and(
        eq(entities.userId, params.userId),
        isNull(entities.deletedAt),
        params.type ? eq(entities.type, params.type) : undefined,
      ),
    );

  const visible = rows.filter((row) => {
    if (params.excludeCampaignId && row.campaignId === params.excludeCampaignId) return false;
    if (row.campaignId === null) return true;
    if (params.includeDeletedCampaigns) return true;
    return row.campaignDeletedAt === null;
  });

  const groups = new Map<string, RegistryRow[]>();
  for (const row of visible) {
    const rootId = row.lineageRootId ?? row.id;
    const list = groups.get(rootId);
    if (list) {
      list.push(row);
    } else {
      groups.set(rootId, [row]);
    }
  }

  const query = params.query?.trim().toLowerCase();
  const result: RegistryGroup[] = [];

  for (const [effectiveRootId, groupRows] of groups) {
    const matches =
      !query ||
      groupRows.some(
        (row) => row.name.toLowerCase().includes(query) || row.summary.toLowerCase().includes(query),
      );
    if (!matches) continue;

    const sorted = [...groupRows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    // Representative header: the effective root row itself if it's
    // visible, else the earliest-created remaining variant (the root's
    // campaign can be hidden by the soft-delete toggle while sibling
    // variants stay visible).
    const header = sorted.find((row) => row.id === effectiveRootId) ?? sorted[0];

    result.push({
      effectiveRootId,
      type: header.type as EntityType,
      headerName: header.name,
      headerSummary: header.summary,
      versionCount: sorted.length,
      variants: sorted.map((row) => ({
        id: row.id,
        name: row.name,
        summary: row.summary,
        type: row.type as EntityType,
        sourceLabel: row.campaignId === null ? "Library" : (row.campaignTitle ?? "Unknown campaign"),
        campaignId: row.campaignId,
        isDeletedCampaign: row.campaignId !== null && row.campaignDeletedAt !== null,
      })),
    });
  }

  result.sort((a, b) => a.headerName.localeCompare(b.headerName));
  return result;
}

/**
 * Save-to-library visibility rule: shown only when no library-scoped
 * entity shares this entity's effective root. Checked across the whole
 * lineage group, not just the one row, so every variant hides the
 * button together once any of them has a library copy.
 */
export async function hasLibraryVariant(userId: string, effectiveRootId: string): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ id: entities.id })
    .from(entities)
    .where(
      and(
        eq(entities.userId, userId),
        isNull(entities.deletedAt),
        isNull(entities.campaignId),
        or(eq(entities.id, effectiveRootId), eq(entities.lineageRootId, effectiveRootId)),
      ),
    )
    .limit(1);
  return Boolean(row);
}

export interface ProvenanceLabel {
  /** "Library" or a campaign title, when this entity is a forked copy. */
  copiedFrom: string | null;
  /** An srd_entries name, when this entity was added directly from the SRD (never set on a fork). */
  srdSource: string | null;
}

/**
 * Provenance is root-derived, not path-derived: architecture.md's
 * lineage decision records only the flat effective root, never
 * fork-path history, so "copied from X" always names the ROOT's
 * campaign (or Library), even for a fork-of-a-fork. srd_source_id and
 * lineage_root_id are mutually exclusive on every row (forks never
 * carry srd_source_id forward), so at most one of the two fields below
 * is ever non-null.
 */
export async function resolveProvenanceLabel(entity: {
  lineageRootId: string | null;
  srdSourceId: string | null;
}): Promise<ProvenanceLabel> {
  const db = getDb();

  if (entity.lineageRootId) {
    const [root] = await db
      .select({ campaignId: entities.campaignId, campaignTitle: campaigns.title })
      .from(entities)
      .leftJoin(campaigns, eq(entities.campaignId, campaigns.id))
      .where(eq(entities.id, entity.lineageRootId));
    const copiedFrom = !root ? null : root.campaignId === null ? "Library" : (root.campaignTitle ?? "another campaign");
    return { copiedFrom, srdSource: null };
  }

  if (entity.srdSourceId) {
    const [srdEntry] = await db.select({ name: srdEntries.name }).from(srdEntries).where(eq(srdEntries.id, entity.srdSourceId));
    return { copiedFrom: null, srdSource: srdEntry?.name ?? null };
  }

  return { copiedFrom: null, srdSource: null };
}
