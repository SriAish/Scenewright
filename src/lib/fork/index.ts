import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { campaigns, entities, srdEntries } from "@/db/schema";
import { deriveSummary, mapItemData, mapMonsterData } from "@/lib/srd/mapping";

/*
  Fork service, per docs/architecture.md: "single implementation for all
  copy operations (cross-campaign import, SRD add, library import,
  save-to-library): lineage resolution, mention flattening, referenced-
  entity copy prompt. Transactional."

  Only srdAdd is implemented in this build step (step 9). The other three
  are stubbed so their call sites and error handling exist, without
  guessing at UI flows (screen 12's flatten/copy prompt, library scope)
  that later steps design. srdAdd's entities-row insert (below, inside
  its transaction) is the seam: step 14, once a second caller needs the
  same insert, should factor it into a shared helper rather than
  duplicating it. Left inline for now since one caller doesn't justify
  the abstraction yet.
*/

export class ForkNotFoundError extends Error {}

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

export interface CrossCampaignImportInput {
  sourceEntityId: string;
  targetCampaignId: string;
  userId: string;
  mentionStrategy: "flatten" | "copyReferenced";
}

/** Screen 12's "Import from my campaigns" flow. Not implemented until step 14. */
export async function crossCampaignImport(input: CrossCampaignImportInput): Promise<never> {
  void input;
  throw new Error("crossCampaignImport is not implemented yet (build step 14)");
}

export interface LibraryImportInput {
  sourceEntityId: string;
  targetCampaignId: string;
  userId: string;
}

/** Library entity -> campaign copy, via the same registry/import flow. Not implemented until step 14. */
export async function libraryImport(input: LibraryImportInput): Promise<never> {
  void input;
  throw new Error("libraryImport is not implemented yet (build step 14)");
}

export interface SaveToLibraryInput {
  sourceEntityId: string;
  userId: string;
}

/** Campaign entity -> library (campaign_id null), the reverse fork. Not implemented until step 14. */
export async function saveToLibrary(input: SaveToLibraryInput): Promise<never> {
  void input;
  throw new Error("saveToLibrary is not implemented yet (build step 14)");
}
