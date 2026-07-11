import { NextResponse } from "next/server";
import { z } from "zod";
import { and, asc, eq, ilike, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { entities } from "@/db/schema";
import { requireUser } from "@/app/api/campaigns/_shared";

/*
  Library-scoped @ / [[ mention autocomplete: same shape and limit as
  /api/campaigns/[id]/entities/search, scoped to campaign_id IS NULL
  instead of a campaign. Not wired into a real editor yet (entity
  detail's backstory field is still the plain-text stand-in in both
  scopes), but the endpoint exists now so that wiring doesn't need a
  second scoped autocomplete built later.
*/

const DEFAULT_LIMIT = 6;

const querySchema = z.object({
  q: z.string().trim().min(1),
  limit: z.coerce.number().int().positive().max(20).optional(),
});

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
        isNull(entities.campaignId),
        eq(entities.userId, user.id),
        isNull(entities.deletedAt),
        ilike(entities.name, `${escapeLikePattern(parsed.data.q)}%`),
      ),
    )
    .orderBy(asc(entities.name))
    .limit(parsed.data.limit ?? DEFAULT_LIMIT);

  return NextResponse.json(rows);
}
