import { NextResponse } from "next/server";
import { asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { scenes } from "@/db/schema";
import { requireUser } from "../../_shared";
import { createSceneSchema, requireOwnedCampaign, EMPTY_DOC } from "./_shared";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const campaign = await requireOwnedCampaign(id, user.id);
  if (!campaign) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const db = getDb();
  const rows = await db.select().from(scenes).where(eq(scenes.campaignId, id)).orderBy(asc(scenes.sortIndex));

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

  const parsed = createSceneSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = getDb();
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(scenes)
    .where(eq(scenes.campaignId, id));

  const [created] = await db
    .insert(scenes)
    .values({
      campaignId: id,
      name: parsed.data.name.trim(),
      status: "not_run",
      startJson: EMPTY_DOC,
      endJson: EMPTY_DOC,
      narrationJson: EMPTY_DOC,
      sortIndex: count,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
