import { NextResponse } from "next/server";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { campaigns, scenes } from "@/db/schema";
import { createCampaignSchema, requireUser, EMPTY_DOC } from "./_shared";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const rows = await db
    .select({
      id: campaigns.id,
      title: campaigns.title,
      premise: campaigns.premise,
      status: campaigns.status,
      updatedAt: campaigns.updatedAt,
      sceneCount: sql<number>`count(${scenes.id})`.mapWith(Number),
    })
    .from(campaigns)
    .leftJoin(scenes, eq(scenes.campaignId, campaigns.id))
    .where(and(eq(campaigns.userId, user.id), isNull(campaigns.deletedAt)))
    .groupBy(campaigns.id)
    .orderBy(desc(campaigns.updatedAt));

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createCampaignSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const premise = parsed.data.premise?.trim() || null;

  const db = getDb();
  const [created] = await db
    .insert(campaigns)
    .values({
      userId: user.id,
      title: parsed.data.title.trim(),
      premise,
      status: "draft",
      notesJson: EMPTY_DOC,
    })
    .returning({
      id: campaigns.id,
      title: campaigns.title,
      premise: campaigns.premise,
      status: campaigns.status,
      updatedAt: campaigns.updatedAt,
    });

  return NextResponse.json({ ...created, sceneCount: 0 }, { status: 201 });
}
