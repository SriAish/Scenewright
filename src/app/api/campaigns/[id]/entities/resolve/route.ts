import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { entities } from "@/db/schema";
import { requireUser } from "../../../_shared";
import { requireOwnedCampaign } from "../_shared";

/*
  Batch id -> entity resolver: MentionEditor scans a doc's mention nodes
  (id + type only, no name, per features-and-decisions.md's rename-
  propagation design) and calls this once per unique id set to resolve
  name/summary/image/deleted state for chip rendering. A batch endpoint
  rather than embedding entities in the doc fetch, since MentionEditor is
  handed doc JSON by its caller (scene/backstory save paths) rather than
  fetching its own document, so there is no single "doc fetch" response
  to embed a map into.

  Deliberately not scoped to non-deleted entities: a soft-deleted
  entity's mention must still resolve a name so its chip can render
  greyed rather than blank.
*/

const querySchema = z.object({
  ids: z.string().min(1),
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const campaign = await requireOwnedCampaign(id, user.id);
  if (!campaign) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json([]);
  }

  const ids = Array.from(
    new Set(parsed.data.ids.split(",").map((value) => value.trim()).filter((value) => UUID_RE.test(value))),
  );
  if (ids.length === 0) {
    return NextResponse.json([]);
  }

  const db = getDb();
  const rows = await db
    .select({
      id: entities.id,
      type: entities.type,
      name: entities.name,
      summary: entities.summary,
      imagePath: entities.imagePath,
      deletedAt: entities.deletedAt,
    })
    .from(entities)
    .where(and(eq(entities.campaignId, id), inArray(entities.id, ids)));

  return NextResponse.json(rows);
}
