import { and, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { campaigns, entities, srdEntries } from "@/db/schema";
import { deriveSummary, mapItemData, mapMonsterData } from "@/lib/srd/mapping";
import { extractMentionedEntityIds } from "@/lib/mentions/extract";
import { rebuildMentions, type MentionsTx } from "@/lib/mentions";

/*
  Fork service, per docs/architecture.md: "single implementation for all
  copy operations (cross-campaign import, SRD add, library import,
  save-to-library): lineage resolution, mention flattening, referenced-
  entity copy prompt. Transactional."
*/

export class ForkNotFoundError extends Error {}

type Db = ReturnType<typeof getDb>;
type Executor = MentionsTx | Db;
type MentionStrategy = "flatten" | "copyReferenced";
type EntityRow = typeof entities.$inferSelect;

export interface SrdAddInput {
  srdEntryId: string;
  campaignId: string;
  userId: string;
}

/**
 * srdAdd: srd_entries row -> a new entities row in the target campaign.
 * lineage_root_id stays null (the copy is a new root, per the
 * established convention); srd_source_id records the SRD provenance.
 * No mention flattening or referenced-entity prompt: SRD entries have no
 * backstory to flatten.
 */
export async function srdAdd(input: SrdAddInput) {
  const db = getDb();

  return db.transaction(async (tx) => {
    const [campaign] = await tx
      .select({ id: campaigns.id })
      .from(campaigns)
      .where(and(eq(campaigns.id, input.campaignId), eq(campaigns.userId, input.userId), isNull(campaigns.deletedAt)));
    if (!campaign) {
      throw new ForkNotFoundError("Campaign not found");
    }

    const [srdEntry] = await tx.select().from(srdEntries).where(eq(srdEntries.id, input.srdEntryId));
    if (!srdEntry) {
      throw new ForkNotFoundError("SRD entry not found");
    }

    const type = srdEntry.type as "monster" | "item";
    const data = type === "monster" ? mapMonsterData(srdEntry) : mapItemData(srdEntry);
    const summary = deriveSummary(data.description);

    const [created] = await tx
      .insert(entities)
      .values({
        userId: input.userId,
        campaignId: input.campaignId,
        type,
        name: srdEntry.name,
        summary,
        data,
        backstoryJson: null,
        lineageRootId: null,
        srdSourceId: srdEntry.id,
      })
      .returning();
    return created;
  });
}

/*
  Cross-scope backstory reference resolution, shared by the read-only
  preview endpoint (screen 12's confirm step, called with the plain db
  before anything is written) and the fork transaction itself (which
  always re-runs this fresh rather than trusting a client-supplied
  preview, since time may have passed between the two calls).

  "Present in the target scope" means the referenced entity's own
  campaign_id equals the target's (both null for library). Entities
  already present need no flatten/copy treatment at all: the mention
  stays pointed at the same id, which is already valid in the target.
*/
export async function computeCrossScopeReferences(
  executor: Executor,
  backstoryJson: unknown,
  targetCampaignId: string | null,
): Promise<{ id: string; name: string; campaignId: string | null }[]> {
  const ids = extractMentionedEntityIds([backstoryJson]);
  if (ids.length === 0) return [];

  const rows = await executor
    .select({ id: entities.id, name: entities.name, campaignId: entities.campaignId })
    .from(entities)
    .where(inArray(entities.id, ids));

  return rows.filter((row) => row.campaignId !== targetCampaignId);
}

interface DocNode {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: DocNode[];
  [key: string]: unknown;
}

/**
 * Rewrites one backstory doc's mention nodes per the fork's mention
 * strategy. Mentions already valid in the target scope (not in
 * `crossScopeRefs`) are left untouched. Mentions outside the target
 * scope either flatten to a plain text node carrying the entity's
 * current name, or, when `remap` has an entry for that id (only ever
 * populated at depth 0 with strategy "copyReferenced"), have their id
 * attr rewritten to point at the newly forked copy.
 */
function transformBackstoryDoc(
  doc: unknown,
  crossScopeRefs: Map<string, { name: string }>,
  remap: Map<string, string>,
): unknown {
  if (typeof doc !== "object" || doc === null) return doc;
  const node = doc as DocNode;

  if (node.type === "mention" && typeof node.attrs?.id === "string") {
    const id = node.attrs.id;
    const ref = crossScopeRefs.get(id);
    if (!ref) return node;

    const remappedId = remap.get(id);
    if (remappedId) {
      return { ...node, attrs: { ...node.attrs, id: remappedId } };
    }
    return { type: "text", text: ref.name };
  }

  if (Array.isArray(node.content)) {
    return { ...node, content: node.content.map((child) => transformBackstoryDoc(child, crossScopeRefs, remap)) };
  }

  return node;
}

interface ForkEntityCoreParams {
  source: EntityRow;
  targetCampaignId: string | null;
  userId: string;
  mentionStrategy: MentionStrategy;
  /**
   * 0 for the entity the caller explicitly chose to fork; 1 for an
   * entity being copied along because the source's backstory mentioned
   * it. Depth-1 forks are always forced to "flatten" and never
   * themselves trigger further referenced-entity copies: the copy
   * prompt is one level deep only, per the build instructions.
   */
  depth: 0 | 1;
}

/**
 * The one fork implementation every public operation below wraps in a
 * transaction: copies an entity's name/summary/data/image verbatim,
 * resolves lineage_root_id to the source's effective root (flat, never
 * a chain), never carries srd_source_id forward (only srdAdd sets that;
 * a fork's ultimate SRD origin stays discoverable via its lineage
 * root), and rewrites backstory mentions per mentionStrategy.
 */
async function forkEntityCore(tx: MentionsTx, params: ForkEntityCoreParams) {
  const { source, targetCampaignId, userId, mentionStrategy, depth } = params;
  const effectiveRootId = source.lineageRootId ?? source.id;

  let backstoryJson: unknown = source.backstoryJson;

  if (source.type === "npc" && source.backstoryJson) {
    const references = await computeCrossScopeReferences(tx, source.backstoryJson, targetCampaignId);

    if (references.length > 0) {
      const remap = new Map<string, string>();

      if (mentionStrategy === "copyReferenced" && depth === 0) {
        for (const reference of references) {
          const [referencedSource] = await tx.select().from(entities).where(eq(entities.id, reference.id));
          if (!referencedSource) continue;

          const copy = await forkEntityCore(tx, {
            source: referencedSource,
            targetCampaignId,
            userId,
            mentionStrategy: "flatten",
            depth: 1,
          });
          remap.set(reference.id, copy.id);
        }
      }

      const crossScopeRefs = new Map(references.map((reference) => [reference.id, { name: reference.name }]));
      backstoryJson = transformBackstoryDoc(source.backstoryJson, crossScopeRefs, remap);
    }
  }

  const [created] = await tx
    .insert(entities)
    .values({
      userId,
      campaignId: targetCampaignId,
      type: source.type as "npc" | "monster" | "item",
      name: source.name,
      summary: source.summary,
      data: source.data,
      backstoryJson,
      imagePath: source.imagePath,
      lineageRootId: effectiveRootId,
      srdSourceId: null,
    })
    .returning();

  if (source.type === "npc") {
    await rebuildMentions(tx, {
      sourceType: "entity_backstory",
      sourceId: created.id,
      campaignId: targetCampaignId,
      docs: [backstoryJson],
    });
  }

  return created;
}

async function requireOwnedSourceEntity(tx: MentionsTx, entityId: string, userId: string): Promise<EntityRow> {
  const [source] = await tx
    .select()
    .from(entities)
    .where(and(eq(entities.id, entityId), eq(entities.userId, userId), isNull(entities.deletedAt)));
  if (!source) {
    throw new ForkNotFoundError("Source entity not found");
  }
  return source;
}

async function requireOwnedTargetCampaign(tx: MentionsTx, campaignId: string, userId: string): Promise<void> {
  const [campaign] = await tx
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId), isNull(campaigns.deletedAt)));
  if (!campaign) {
    throw new ForkNotFoundError("Target campaign not found");
  }
}

export interface CrossCampaignImportInput {
  sourceEntityId: string;
  targetCampaignId: string;
  userId: string;
  mentionStrategy: MentionStrategy;
}

/** Screen 12's "Import from my campaigns" flow: campaign-scoped source, campaign-scoped target. */
export async function crossCampaignImport(input: CrossCampaignImportInput) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const source = await requireOwnedSourceEntity(tx, input.sourceEntityId, input.userId);
    if (source.campaignId === null) {
      throw new ForkNotFoundError("Source entity not found");
    }
    await requireOwnedTargetCampaign(tx, input.targetCampaignId, input.userId);

    return forkEntityCore(tx, {
      source,
      targetCampaignId: input.targetCampaignId,
      userId: input.userId,
      mentionStrategy: input.mentionStrategy,
      depth: 0,
    });
  });
}

export interface LibraryImportInput {
  sourceEntityId: string;
  targetCampaignId: string;
  userId: string;
  mentionStrategy: MentionStrategy;
}

/** Library entity -> campaign copy, via the same registry/import flow. */
export async function libraryImport(input: LibraryImportInput) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const source = await requireOwnedSourceEntity(tx, input.sourceEntityId, input.userId);
    if (source.campaignId !== null) {
      throw new ForkNotFoundError("Source entity not found");
    }
    await requireOwnedTargetCampaign(tx, input.targetCampaignId, input.userId);

    return forkEntityCore(tx, {
      source,
      targetCampaignId: input.targetCampaignId,
      userId: input.userId,
      mentionStrategy: input.mentionStrategy,
      depth: 0,
    });
  });
}

export interface SaveToLibraryInput {
  sourceEntityId: string;
  userId: string;
  mentionStrategy: MentionStrategy;
}

/** Campaign entity -> library (campaign_id null), the reverse fork. */
export async function saveToLibrary(input: SaveToLibraryInput) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const source = await requireOwnedSourceEntity(tx, input.sourceEntityId, input.userId);
    if (source.campaignId === null) {
      throw new ForkNotFoundError("Source entity not found");
    }

    return forkEntityCore(tx, {
      source,
      targetCampaignId: null,
      userId: input.userId,
      mentionStrategy: input.mentionStrategy,
      depth: 0,
    });
  });
}
