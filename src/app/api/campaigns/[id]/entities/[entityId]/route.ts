import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { entities } from "@/db/schema";
import { requireUser } from "../../../_shared";
import { entityDataSchemas, requireOwnedCampaign, updateEntitySchema } from "../_shared";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; entityId: string }> },
) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, entityId } = await params;
  const campaign = await requireOwnedCampaign(id, user.id);
  if (!campaign) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = updateEntitySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = getDb();
  const [existing] = await db
    .select({ id: entities.id, type: entities.type })
    .from(entities)
    .where(and(eq(entities.id, entityId), eq(entities.campaignId, id), isNull(entities.deletedAt)));
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const values: Partial<typeof entities.$inferInsert> = {};
  if (parsed.data.name !== undefined) values.name = parsed.data.name.trim();
  if (parsed.data.summary !== undefined) values.summary = parsed.data.summary;

  if (parsed.data.data !== undefined) {
    // Data keys outside the entity's type schema are rejected here, so
    // later generation and SRD-fork steps land on clean shapes.
    const dataSchema = entityDataSchemas[existing.type as keyof typeof entityDataSchemas];
    const parsedData = dataSchema.safeParse(parsed.data.data);
    if (!parsedData.success) {
      return NextResponse.json({ error: parsedData.error.flatten() }, { status: 400 });
    }
    values.data = parsedData.data;
  }

  if (parsed.data.backstoryJson !== undefined) {
    if (existing.type !== "npc") {
      return NextResponse.json({ error: "backstoryJson only applies to npc entities" }, { status: 400 });
    }
    values.backstoryJson = parsed.data.backstoryJson;
  }

  const [updated] = await db
    .update(entities)
    .set(values)
    .where(and(eq(entities.id, entityId), eq(entities.campaignId, id)))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; entityId: string }> },
) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, entityId } = await params;
  const campaign = await requireOwnedCampaign(id, user.id);
  if (!campaign) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const db = getDb();
  const [deleted] = await db
    .update(entities)
    .set({ deletedAt: new Date() })
    .where(and(eq(entities.id, entityId), eq(entities.campaignId, id), isNull(entities.deletedAt)))
    .returning({ id: entities.id });

  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ id: deleted.id });
}
