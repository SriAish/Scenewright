import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { scenes } from "@/db/schema";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "../../../../_shared";
import { requireOwnedCampaign } from "../../_shared";
import { buildMapStoragePath, mapUploadUrlSchema, SCENE_MAPS_BUCKET } from "./_shared";

/*
  Issues a signed upload URL for a scene map image, per architecture.md's
  image upload call flow: API issues signed URL, client uploads direct
  to storage, path saved via the normal scene PATCH. Content type and
  size are validated here (before any bytes move); Supabase Storage
  itself does not enforce either from a signed-upload-URL client PUT.
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

  const db = getDb();
  const [scene] = await db
    .select({ id: scenes.id })
    .from(scenes)
    .where(and(eq(scenes.id, sceneId), eq(scenes.campaignId, id)));
  if (!scene) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = mapUploadUrlSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const path = buildMapStoragePath(id, sceneId, parsed.data.contentType);
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(SCENE_MAPS_BUCKET).createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json({ error: "Failed to issue upload URL" }, { status: 500 });
  }

  return NextResponse.json({ path: data.path, signedUrl: data.signedUrl, token: data.token });
}
