import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { entities } from "@/db/schema";
import { requireUser } from "@/app/api/campaigns/_shared";

/*
  Library-scoped batch id -> entity resolver, mirroring
  /api/campaigns/[id]/entities/resolve. Deliberately not scoped to
  non-deleted entities, same reason as the campaign version: a
  soft-deleted entity's mention must still resolve a name so its chip
  can render greyed rather than blank.
*/

const querySchema = z.object({
  ids: z.string().min(1),
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    .where(and(isNull(entities.campaignId), eq(entities.userId, user.id), inArray(entities.id, ids)));

  return NextResponse.json(rows);
}
