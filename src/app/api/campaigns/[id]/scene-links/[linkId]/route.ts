import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { sceneLinks } from "@/db/schema";
import { requireUser } from "../../../_shared";
import { requireOwnedCampaign, updateSceneLinkSchema } from "../_shared";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; linkId: string }> },
) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, linkId } = await params;
  const campaign = await requireOwnedCampaign(id, user.id);
  if (!campaign) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = updateSceneLinkSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = getDb();
  const [updated] = await db
    .update(sceneLinks)
    .set({ label: parsed.data.label || null })
    .where(and(eq(sceneLinks.id, linkId), eq(sceneLinks.campaignId, id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; linkId: string }> },
) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, linkId } = await params;
  const campaign = await requireOwnedCampaign(id, user.id);
  if (!campaign) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const db = getDb();
  const [deleted] = await db
    .delete(sceneLinks)
    .where(and(eq(sceneLinks.id, linkId), eq(sceneLinks.campaignId, id)))
    .returning({ id: sceneLinks.id });

  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ id: deleted.id });
}
