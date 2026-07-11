import { NextResponse } from "next/server";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { campaigns, entities } from "@/db/schema";
import { requireUser } from "@/app/api/campaigns/_shared";
import { createEntitySchema, entityTypeSchema, EMPTY_DOC } from "./_shared";

/*
  Library-scoped entities: same shape as /api/campaigns/[id]/entities,
  scoped to campaign_id IS NULL and the current user instead of an owned
  campaign. Library cards never carry a scene count (no scenes exist
  outside a campaign), so sceneCount is always 0 here rather than a
  reverse-lookup join.
*/

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const typeParam = new URL(request.url).searchParams.get("type");
  const parsedType = entityTypeSchema.safeParse(typeParam);
  if (!parsedType.success) {
    return NextResponse.json({ error: "type must be npc, monster, or item" }, { status: 400 });
  }

  const db = getDb();
  const rows = await db
    .select({
      id: entities.id,
      campaignId: entities.campaignId,
      type: entities.type,
      name: entities.name,
      summary: entities.summary,
      data: entities.data,
      backstoryJson: entities.backstoryJson,
      imagePath: entities.imagePath,
      lineageRootId: entities.lineageRootId,
      srdSourceId: entities.srdSourceId,
      updatedAt: entities.updatedAt,
    })
    .from(entities)
    .where(
      and(
        isNull(entities.campaignId),
        eq(entities.userId, user.id),
        eq(entities.type, parsedType.data),
        isNull(entities.deletedAt),
      ),
    )
    .orderBy(entities.name);

  // "Saved from [campaign]" per screen 13's NPC card footer: batched
  // lookup of each row's lineage root's campaign, same root-derived
  // provenance rule as entity detail's copiedFrom (src/lib/registry).
  const rootIds = Array.from(new Set(rows.map((row) => row.lineageRootId).filter((id): id is string => id !== null)));
  const copiedFromById = new Map<string, string | null>();
  if (rootIds.length > 0) {
    const roots = await db
      .select({ id: entities.id, campaignId: entities.campaignId, campaignTitle: campaigns.title })
      .from(entities)
      .leftJoin(campaigns, eq(entities.campaignId, campaigns.id))
      .where(inArray(entities.id, rootIds));
    for (const root of roots) {
      copiedFromById.set(root.id, root.campaignId === null ? "Library" : (root.campaignTitle ?? "another campaign"));
    }
  }

  return NextResponse.json(
    rows.map((row) => ({
      ...row,
      sceneCount: 0,
      copiedFrom: row.lineageRootId ? (copiedFromById.get(row.lineageRootId) ?? null) : null,
    })),
  );
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createEntitySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = getDb();
  const [created] = await db
    .insert(entities)
    .values({
      userId: user.id,
      campaignId: null,
      type: parsed.data.type,
      name: parsed.data.name.trim(),
      summary: "",
      data: {},
      backstoryJson: parsed.data.type === "npc" ? EMPTY_DOC : null,
    })
    .returning();

  return NextResponse.json({ ...created, sceneCount: 0 }, { status: 201 });
}
