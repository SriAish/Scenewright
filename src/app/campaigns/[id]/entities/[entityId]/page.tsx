import { notFound, redirect } from "next/navigation";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { campaigns, entities, mentions, scenes, srdEntries } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { EntityDetail, type AppearsInRow } from "@/components/entities/EntityDetail";
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

  const [row] = await db
    .select({ entity: entities, srdSourceName: srdEntries.name })
    .from(entities)
    .leftJoin(srdEntries, eq(entities.srdSourceId, srdEntries.id))
    .where(and(eq(entities.id, entityId), eq(entities.campaignId, id), isNull(entities.deletedAt)));

  if (!row) {
    notFound();
  }
  const { entity, srdSourceName } = row;

  const mentionRows = await db
    .select({ sourceType: mentions.sourceType, sourceId: mentions.sourceId })
    .from(mentions)
    .where(eq(mentions.entityId, entityId));

  const sceneIds = mentionRows.filter((row) => row.sourceType === "scene").map((row) => row.sourceId);
  const backstoryEntityIds = mentionRows
    .filter((row) => row.sourceType === "entity_backstory")
    .map((row) => row.sourceId);

  const [sceneNames, backstoryEntityNames] = await Promise.all([
    sceneIds.length
      ? db.select({ id: scenes.id, name: scenes.name }).from(scenes).where(inArray(scenes.id, sceneIds))
      : Promise.resolve([]),
    backstoryEntityIds.length
      ? db.select({ id: entities.id, name: entities.name }).from(entities).where(inArray(entities.id, backstoryEntityIds))
      : Promise.resolve([]),
  ]);
  const sceneNameById = new Map(sceneNames.map((row) => [row.id, row.name]));
  const backstoryNameById = new Map(backstoryEntityNames.map((row) => [row.id, row.name]));

  // campaign_notes mentions can exist in mentions rows in principle, but
  // nothing writes them yet (the notes tab is a later build step per
  // build-brief.md); skip rows this page can't yet resolve to a link.
  const appearsIn: AppearsInRow[] = mentionRows.flatMap((row) => {
    if (row.sourceType === "scene") {
      const name = sceneNameById.get(row.sourceId);
      if (!name) return [];
      return [{ label: name, href: `/campaigns/${campaign.id}/scenes/${row.sourceId}` }];
    }
    if (row.sourceType === "entity_backstory") {
      const name = backstoryNameById.get(row.sourceId);
      if (!name) return [];
      return [{ label: `${name}'s backstory`, href: `/campaigns/${campaign.id}/entities/${row.sourceId}` }];
    }
    return [];
  });

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
      srdSourceName={srdSourceName}
      appearsIn={appearsIn}
    />
  );
}
