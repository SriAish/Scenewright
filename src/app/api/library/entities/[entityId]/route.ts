import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { entities } from "@/db/schema";
import { rebuildMentions } from "@/lib/mentions";
import { requireUser } from "@/app/api/campaigns/_shared";
import { entityDataSchemas, updateEntitySchema } from "../_shared";

export async function PATCH(request: Request, { params }: { params: Promise<{ entityId: string }> }) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { entityId } = await params;

  const parsed = updateEntitySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = getDb();
  const [existing] = await db
    .select({ id: entities.id, type: entities.type })
    .from(entities)
    .where(
      and(
        eq(entities.id, entityId),
        isNull(entities.campaignId),
        eq(entities.userId, user.id),
        isNull(entities.deletedAt),
      ),
    );
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const values: Partial<typeof entities.$inferInsert> = {};
  if (parsed.data.name !== undefined) values.name = parsed.data.name.trim();
  if (parsed.data.summary !== undefined) values.summary = parsed.data.summary;

  if (parsed.data.data !== undefined) {
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

  const updated = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(entities)
      .set(values)
      .where(and(eq(entities.id, entityId), isNull(entities.campaignId)))
      .returning();

    if (parsed.data.backstoryJson !== undefined) {
      await rebuildMentions(tx, {
        sourceType: "entity_backstory",
        sourceId: entityId,
        campaignId: null,
        docs: [parsed.data.backstoryJson],
      });
    }

    return row;
  });

  return NextResponse.json({ ...updated, sceneCount: 0 });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ entityId: string }> }) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { entityId } = await params;

  const db = getDb();
  const [deleted] = await db
    .update(entities)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(entities.id, entityId),
        isNull(entities.campaignId),
        eq(entities.userId, user.id),
        isNull(entities.deletedAt),
      ),
    )
    .returning({ id: entities.id });

  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ id: deleted.id });
}
