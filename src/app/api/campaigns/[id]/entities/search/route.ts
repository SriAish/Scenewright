import { NextResponse } from "next/server";
import { z } from "zod";
import { and, asc, eq, ilike, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { entities } from "@/db/schema";
import { requireUser } from "../../../_shared";
import { requireOwnedCampaign } from "../_shared";

/*
  @ / [[ mention autocomplete, screen 7's dropdown: debounced prefix query
  per the call flow in docs/architecture.md, campaign-scoped, matching
  across all three entity types (the dropdown mixes NPCs, monsters, and
  items in one list, per the frame). Soft-deleted excluded. Small result
  cap (6): the frame's example dropdown shows 4 rows at a fixed 270px
  width with no scroll affordance; docs don't specify a number.
*/

const DEFAULT_LIMIT = 6;

const querySchema = z.object({
  q: z.string().trim().min(1),
  limit: z.coerce.number().int().positive().max(20).optional(),
});

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

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
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = getDb();
  const rows = await db
    .select({ id: entities.id, type: entities.type, name: entities.name })
    .from(entities)
    .where(
      and(
        eq(entities.campaignId, id),
        isNull(entities.deletedAt),
        ilike(entities.name, `${escapeLikePattern(parsed.data.q)}%`),
      ),
    )
    .orderBy(asc(entities.name))
    .limit(parsed.data.limit ?? DEFAULT_LIMIT);

  return NextResponse.json(rows);
}
