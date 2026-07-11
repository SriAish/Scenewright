import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { entities, sceneEntities, scenes } from "@/db/schema";
import { requireUser } from "../../../../_shared";
import { requireOwnedCampaign } from "../../_shared";
import { addSceneEntitySchema } from "./_shared";

/*
  Manual sidebar addition, step 0's scene_entities table. This is a
  no-op if the entity is already manually added (unique on scene_id +
  entity_id) and a no-op in effect (though the row is still written) if
  the entity is already mentioned in the text, since the sidebar renders
  the union and the mention wins the auto/manual dedup at read time.
*/
export async function POST(
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

  const parsed = addSceneEntitySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = getDb();
  const [scene] = await db
    .select({ id: scenes.id })
    .from(scenes)
    .where(and(eq(scenes.id, sceneId), eq(scenes.campaignId, id)));
  if (!scene) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [entity] = await db
    .select({ id: entities.id })
    .from(entities)
    .where(and(eq(entities.id, parsed.data.entityId), eq(entities.campaignId, id)));
  if (!entity) {
    return NextResponse.json({ error: "Entity not found in this campaign" }, { status: 404 });
  }

  await db
    .insert(sceneEntities)
    .values({ sceneId, entityId: parsed.data.entityId })
    .onConflictDoNothing();

  return NextResponse.json({ sceneId, entityId: parsed.data.entityId }, { status: 201 });
}
