import { NextResponse } from "next/server";
import { and, eq, inArray, or } from "drizzle-orm";
import { getDb } from "@/db";
import { entities, mentions, sceneEntities, sceneLinks, scenes } from "@/db/schema";
import { rebuildMentions } from "@/lib/mentions";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "../../../_shared";
import { requireOwnedCampaign, updateSceneSchema } from "../_shared";
import { SCENE_MAPS_BUCKET } from "./map-upload-url/_shared";

// Signed read URL lifetime for the map thumbnail: long enough to cover
// a page view, short enough that a leaked URL doesn't linger.
const MAP_IMAGE_URL_TTL_SECONDS = 300;

export async function GET(
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
  const [scene] = await db
    .select()
    .from(scenes)
    .where(and(eq(scenes.id, sceneId), eq(scenes.campaignId, id)));
  if (!scene) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [predecessors, mentionRows, manualRows] = await Promise.all([
    db
      .select({ id: scenes.id, name: scenes.name, endJson: scenes.endJson })
      .from(sceneLinks)
      .innerJoin(scenes, eq(scenes.id, sceneLinks.fromSceneId))
      .where(and(eq(sceneLinks.campaignId, id), eq(sceneLinks.toSceneId, sceneId))),
    db
      .select({ entityId: mentions.entityId })
      .from(mentions)
      .where(and(eq(mentions.sourceType, "scene"), eq(mentions.sourceId, sceneId))),
    db.select({ entityId: sceneEntities.entityId }).from(sceneEntities).where(eq(sceneEntities.sceneId, sceneId)),
  ]);

  const mentionIds = new Set(mentionRows.map((row) => row.entityId));
  const manualIds = new Set(manualRows.map((row) => row.entityId));
  const allIds = Array.from(new Set([...mentionIds, ...manualIds]));

  const entityRows =
    allIds.length === 0
      ? []
      : await db
          .select({
            id: entities.id,
            type: entities.type,
            name: entities.name,
            summary: entities.summary,
            imagePath: entities.imagePath,
            deletedAt: entities.deletedAt,
          })
          .from(entities)
          .where(and(eq(entities.campaignId, id), inArray(entities.id, allIds)));

  // Union per the settled sidebar rule: an entity both mentioned and
  // manually added renders once, as auto (manual: false). The mention
  // wins; the scene_entities row still exists underneath but has no
  // effect on rendering while the mention persists.
  const sidebarEntities = entityRows.map((row) => ({
    ...row,
    manual: manualIds.has(row.id) && !mentionIds.has(row.id),
  }));

  let mapImageUrl: string | null = null;
  if (scene.mapImagePath) {
    const admin = createAdminClient();
    const { data } = await admin.storage
      .from(SCENE_MAPS_BUCKET)
      .createSignedUrl(scene.mapImagePath, MAP_IMAGE_URL_TTL_SECONDS);
    mapImageUrl = data?.signedUrl ?? null;
  }

  return NextResponse.json({ ...scene, mapImageUrl, predecessors, sidebarEntities });
}

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
  if (parsed.data.mapImagePath !== undefined) values.mapImagePath = parsed.data.mapImagePath;
  if (parsed.data.mapSourceUrl !== undefined) values.mapSourceUrl = parsed.data.mapSourceUrl?.trim() || null;

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
  const { updated, previousMapImagePath } = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({
        startJson: scenes.startJson,
        narrationJson: scenes.narrationJson,
        endJson: scenes.endJson,
        mapImagePath: scenes.mapImagePath,
      })
      .from(scenes)
      .where(and(eq(scenes.id, sceneId), eq(scenes.campaignId, id)));
    if (!existing) {
      return { updated: null, previousMapImagePath: null };
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

    return { updated: row, previousMapImagePath: existing.mapImagePath };
  });

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Replace and Remove both delete the previous storage object rather
  // than orphaning it (decision: deleted, not orphaned) — this is a
  // single-owner app with no other reference to the path, and free-tier
  // storage is finite. Best-effort: a failure here doesn't fail the
  // request, since the DB write (source of truth for what the app shows)
  // already succeeded.
  if (
    parsed.data.mapImagePath !== undefined &&
    previousMapImagePath &&
    previousMapImagePath !== parsed.data.mapImagePath
  ) {
    const admin = createAdminClient();
    await admin.storage.from(SCENE_MAPS_BUCKET).remove([previousMapImagePath]);
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
  // scene_entities rows for this scene are cleaned up the same way.
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

    await tx.delete(sceneEntities).where(eq(sceneEntities.sceneId, sceneId));

    await tx.delete(scenes).where(eq(scenes.id, sceneId));

    return scene;
  });

  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ id: deleted.id });
}
