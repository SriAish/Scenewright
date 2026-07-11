import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { mentions } from "@/db/schema";
import { extractMentionedEntityIds } from "./extract";

/*
  Mention/reverse-lookup service, per docs/architecture.md: "on save of
  any mention-enabled doc, walks Tiptap JSON, extracts mention nodes,
  replaces that document's mention rows in the same transaction as the
  doc write."

  One row per (source_type, source_id) space per unique entity_id: a doc
  mentioning the same entity twice still yields one row, since reverse-
  lookup only answers "does this source reference that entity," not how
  many times.
*/

export { extractMentionedEntityIds };

type MentionSourceType = "scene" | "entity_backstory" | "campaign_notes";

type Db = ReturnType<typeof getDb>;
export type MentionsTx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export interface RebuildMentionsInput {
  sourceType: MentionSourceType;
  sourceId: string;
  campaignId: string | null;
  /**
   * All docs sharing this source's mention row-space. Scene narration
   * collapses start/narration/end into one source (source_type "scene",
   * source_id the scene id), so a scene save must pass all three even
   * when only one field changed, or the rebuild would wipe mentions
   * belonging to the untouched fields.
   */
  docs: unknown[];
}

/**
 * Replaces every mention row for one (sourceType, sourceId) with the set
 * extracted from `docs`. Must run inside the same transaction as the
 * document write it accompanies.
 */
export async function rebuildMentions(tx: MentionsTx, input: RebuildMentionsInput): Promise<void> {
  const entityIds = extractMentionedEntityIds(input.docs);

  await tx
    .delete(mentions)
    .where(and(eq(mentions.sourceType, input.sourceType), eq(mentions.sourceId, input.sourceId)));

  if (entityIds.length === 0) return;

  await tx.insert(mentions).values(
    entityIds.map((entityId) => ({
      entityId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      campaignId: input.campaignId,
    })),
  );
}
