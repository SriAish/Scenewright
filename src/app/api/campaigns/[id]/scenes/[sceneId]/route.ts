import { NextResponse } from "next/server";
import { and, eq, or } from "drizzle-orm";
import { getDb } from "@/db";
import { scenes, sceneLinks } from "@/db/schema";
import { requireUser } from "../../../_shared";
import { requireOwnedCampaign, updateSceneSchema } from "../_shared";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; sceneId: string }> },
) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, sceneId } = await params;
  const campaign = await requireOwnedCampaign(id, user.id);
  if (!campaign) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = updateSceneSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const values: Partial<typeof scenes.$inferInsert> = {};
  if (parsed.data.name !== undefined) values.name = parsed.data.name.trim();
  if (parsed.data.status !== undefined) values.status = parsed.data.status;
  if (parsed.data.startJson !== undefined) values.startJson = parsed.data.startJson;
  if (parsed.data.endJson !== undefined) values.endJson = parsed.data.endJson;
  if (parsed.data.narrationJson !== undefined) values.narrationJson = parsed.data.narrationJson;
  if (parsed.data.sortIndex !== undefined) values.sortIndex = parsed.data.sortIndex;
  if (parsed.data.graphX !== undefined) values.graphX = parsed.data.graphX;
  if (parsed.data.graphY !== undefined) values.graphY = parsed.data.graphY;

  const db = getDb();
  const [updated] = await db
    .update(scenes)
    .set(values)
    .where(and(eq(scenes.id, sceneId), eq(scenes.campaignId, id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; sceneId: string }> },
) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, sceneId } = await params;
  const campaign = await requireOwnedCampaign(id, user.id);
  if (!campaign) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const db = getDb();
  // scene_links has no ON DELETE cascade to scenes, so links referencing
  // this scene are removed first, in the same transaction as the scene.
  const deleted = await db.transaction(async (tx) => {
    const [scene] = await tx
      .select({ id: scenes.id })
      .from(scenes)
      .where(and(eq(scenes.id, sceneId), eq(scenes.campaignId, id)));

    if (!scene) {
      return null;
    }

    await tx
      .delete(sceneLinks)
      .where(
        and(
          eq(sceneLinks.campaignId, id),
          or(eq(sceneLinks.fromSceneId, sceneId), eq(sceneLinks.toSceneId, sceneId)),
        ),
      );

    await tx.delete(scenes).where(eq(scenes.id, sceneId));

    return scene;
  });

  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ id: deleted.id });
}
