import { notFound, redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { campaigns, entities } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { EntityDetail } from "@/components/entities/EntityDetail";
import { ItemData, MonsterData, NpcData } from "@/hooks/useEntities";

export default async function EntityPage({
  params,
}: {
  params: Promise<{ id: string; entityId: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { id, entityId } = await params;
  const db = getDb();

  const [campaign] = await db
    .select({ id: campaigns.id, title: campaigns.title })
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.userId, user.id), isNull(campaigns.deletedAt)));

  if (!campaign) {
    notFound();
  }

  const [entity] = await db
    .select()
    .from(entities)
    .where(and(eq(entities.id, entityId), eq(entities.campaignId, id), isNull(entities.deletedAt)));

  if (!entity) {
    notFound();
  }

  return (
    <EntityDetail
      campaignId={campaign.id}
      campaignTitle={campaign.title}
      entity={{
        id: entity.id,
        type: entity.type as "npc" | "monster" | "item",
        name: entity.name,
        summary: entity.summary,
        data: entity.data as NpcData | MonsterData | ItemData,
        backstoryJson: entity.backstoryJson,
      }}
    />
  );
}
