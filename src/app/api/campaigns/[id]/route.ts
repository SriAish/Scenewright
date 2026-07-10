import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { campaigns } from "@/db/schema";
import { requireUser, updateCampaignSchema } from "../_shared";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const parsed = updateCampaignSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const values: Partial<typeof campaigns.$inferInsert> = {};
  if (parsed.data.title !== undefined) values.title = parsed.data.title.trim();
  if (parsed.data.premise !== undefined) values.premise = parsed.data.premise?.trim() || null;
  if (parsed.data.status !== undefined) values.status = parsed.data.status;

  const db = getDb();
  const [updated] = await db
    .update(campaigns)
    .set(values)
    .where(and(eq(campaigns.id, id), eq(campaigns.userId, user.id), isNull(campaigns.deletedAt)))
    .returning({
      id: campaigns.id,
      title: campaigns.title,
      premise: campaigns.premise,
      status: campaigns.status,
      updatedAt: campaigns.updatedAt,
    });

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = getDb();
  const [deleted] = await db
    .update(campaigns)
    .set({ deletedAt: new Date() })
    .where(and(eq(campaigns.id, id), eq(campaigns.userId, user.id), isNull(campaigns.deletedAt)))
    .returning({ id: campaigns.id });

  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ id: deleted.id });
}
