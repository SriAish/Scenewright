import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { scenes } from "@/db/schema";
import { requireUser } from "../../../_shared";
import { requireOwnedCampaign, reorderScenesSchema } from "../_shared";

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

  const parsed = reorderScenesSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = getDb();
  const existing = await db.select({ id: scenes.id }).from(scenes).where(eq(scenes.campaignId, id));
  const existingIds = new Set(existing.map((scene) => scene.id));
  const requestedIds = parsed.data.sceneIds;
  const isSameSet =
    requestedIds.length === existingIds.size && requestedIds.every((sceneId) => existingIds.has(sceneId));

  if (!isSameSet) {
    return NextResponse.json(
      { error: "sceneIds must match the campaign's current scenes exactly" },
      { status: 400 },
    );
  }

  await db.transaction(async (tx) => {
    for (const [index, sceneId] of requestedIds.entries()) {
      await tx
        .update(scenes)
        .set({ sortIndex: index })
        .where(and(eq(scenes.id, sceneId), eq(scenes.campaignId, id)));
    }
  });

  return NextResponse.json({ ok: true });
}
