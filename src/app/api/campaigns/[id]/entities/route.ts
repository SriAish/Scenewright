import { NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { entities, mentions } from "@/db/schema";
import { requireUser } from "../../_shared";
import { createEntitySchema, entityTypeSchema, requireOwnedCampaign, EMPTY_DOC } from "./_shared";

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

  const typeParam = new URL(request.url).searchParams.get("type");
  const parsedType = entityTypeSchema.safeParse(typeParam);
  if (!parsedType.success) {
    return NextResponse.json({ error: "type must be npc, monster, or item" }, { status: 400 });
  }

  const db = getDb();
  // Reverse-lookup count: distinct scenes mentioning each entity. Empty
  // until step 11 builds the mention/reverse-lookup service, so this
  // renders 0 for every entity today and lights up automatically once
  // mentions start getting written.
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
      sceneCount: sql<number>`count(distinct case when ${mentions.sourceType} = 'scene' then ${mentions.sourceId} end)`.mapWith(
        Number,
      ),
    })
    .from(entities)
    .leftJoin(mentions, eq(mentions.entityId, entities.id))
    .where(and(eq(entities.campaignId, id), eq(entities.type, parsedType.data), isNull(entities.deletedAt)))
    .groupBy(entities.id)
    .orderBy(entities.name);

  return NextResponse.json(rows);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const campaign = await requireOwnedCampaign(id, user.id);
  if (!campaign) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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
      campaignId: id,
      type: parsed.data.type,
      name: parsed.data.name.trim(),
      summary: "",
      data: {},
      backstoryJson: parsed.data.type === "npc" ? EMPTY_DOC : null,
    })
    .returning();

  return NextResponse.json({ ...created, sceneCount: 0 }, { status: 201 });
}
