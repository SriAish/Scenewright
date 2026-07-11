import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { sceneEntities, scenes } from "@/db/schema";
import { requireUser } from "../../../../../_shared";
import { requireOwnedCampaign } from "../../../_shared";

/*
  Removes a manual sidebar addition only. Auto (mention-derived) chips
  have no remove affordance in the UI and this route has no way to
  target one: it deletes the scene_entities row, which does nothing to
  an entity's mention-derived presence in start/narration/end.
*/
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; sceneId: string; entityId: string }> },
) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, sceneId, entityId } = await params;
  const campaign = await requireOwnedCampaign(id, user.id);
  if (!campaign) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const db = getDb();
  // Scenes carry no user_id of their own; ownership is enforced through
  // the parent campaign, matching every other scene-scoped route. Without
  // this check, a caller who owns *a* campaign could delete a
  // scene_entities row belonging to an unrelated scene in a different
  // campaign by supplying a mismatched (id, sceneId) pair.
  const [scene] = await db
    .select({ id: scenes.id })
    .from(scenes)
    .where(and(eq(scenes.id, sceneId), eq(scenes.campaignId, id)));
  if (!scene) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [deleted] = await db
    .delete(sceneEntities)
    .where(and(eq(sceneEntities.sceneId, sceneId), eq(sceneEntities.entityId, entityId)))
    .returning({ id: sceneEntities.id });

  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ id: deleted.id });
}
