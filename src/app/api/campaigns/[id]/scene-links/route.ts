import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { scenes, sceneLinks } from "@/db/schema";
import { requireUser } from "../../_shared";
import { createSceneLinkSchema, requireOwnedCampaign } from "./_shared";

/*
  Links live at their own endpoint rather than folded into the scenes
  list response: the list view never needs them, so this keeps that
  query and payload unchanged, and only the graph view pays the cost
  of fetching them.
*/
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
  const rows = await db.select().from(sceneLinks).where(eq(sceneLinks.campaignId, id));
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

  const parsed = createSceneLinkSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { fromSceneId, toSceneId, label } = parsed.data;
  const db = getDb();

  const validScenes = await db
    .select({ id: scenes.id })
    .from(scenes)
    .where(and(eq(scenes.campaignId, id), inArray(scenes.id, [fromSceneId, toSceneId])));
  if (validScenes.length !== 2) {
    return NextResponse.json({ error: "Both scenes must belong to this campaign" }, { status: 400 });
  }

  const duplicate = await db
    .select({ id: sceneLinks.id })
    .from(sceneLinks)
    .where(
      and(
        eq(sceneLinks.campaignId, id),
        eq(sceneLinks.fromSceneId, fromSceneId),
        eq(sceneLinks.toSceneId, toSceneId),
      ),
    );
  if (duplicate.length > 0) {
    return NextResponse.json({ error: "This link already exists" }, { status: 400 });
  }

  const [created] = await db
    .insert(sceneLinks)
    .values({ campaignId: id, fromSceneId, toSceneId, label: label || null })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
