import { NextResponse } from "next/server";
import { and, eq, or } from "drizzle-orm";
import { getDb } from "@/db";
import { scenes, sceneLinks } from "@/db/schema";
import { rebuildMentions } from "@/lib/mentions";
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

  // start_json, end_json, and narration_json share one mentions row-space
  // (source_type "scene", source_id this scene's id), per architecture.md.
  // A rebuild needs all three fields' current mentions, not just the one(s)
  // touched by this PATCH, or it would wipe mentions from the untouched
  // fields.
  const touchesDoc =
    parsed.data.startJson !== undefined ||
    parsed.data.narrationJson !== undefined ||
    parsed.data.endJson !== undefined;

  const db = getDb();
  const updated = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ startJson: scenes.startJson, narrationJson: scenes.narrationJson, endJson: scenes.endJson })
      .from(scenes)
      .where(and(eq(scenes.id, sceneId), eq(scenes.campaignId, id)));
    if (!existing) {
      return null;
    }

    const [row] = await tx
      .update(scenes)
      .set(values)
      .where(and(eq(scenes.id, sceneId), eq(scenes.campaignId, id)))
      .returning();

    if (touchesDoc) {
      await rebuildMentions(tx, {
        sourceType: "scene",
        sourceId: sceneId,
        campaignId: id,
        docs: [
          parsed.data.startJson ?? existing.startJson,
          parsed.data.narrationJson ?? existing.narrationJson,
          parsed.data.endJson ?? existing.endJson,
        ],
      });
    }

    return row;
  });

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
