import { notFound, redirect } from "next/navigation";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { entities, mentions, scenes, srdEntries } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { EntityDetail, type AppearsInRow } from "@/components/entities/EntityDetail";
import { ItemData, MonsterData, NpcData } from "@/hooks/useEntities";

/*
  Library entity detail: same EntityDetail component as a campaign
  entity, scoped to campaign_id IS NULL instead of an owned campaign.
  Never itself the target of Save-to-library (an entity already in the
  library can't be saved to the library), so copiedFrom/canSaveToLibrary
  are always empty/false here (fork-from-campaign provenance is
  surfaced on the library card grid instead, per screen 13's "Saved
  from [campaign]" line). It can be SRD-derived, though, via the
  library's SRD source view's "Add to library"; srdSourceName is looked
  up from srd_source_id when set, same provenance rule as a campaign
  entity's SRD-derived detail.
*/
export default async function LibraryEntityPage({
  params,
}: {
  params: Promise<{ entityId: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { entityId } = await params;
  const db = getDb();

  const [row] = await db
    .select({ entity: entities })
    .from(entities)
    .where(and(eq(entities.id, entityId), isNull(entities.campaignId), eq(entities.userId, user.id), isNull(entities.deletedAt)));

  if (!row) {
    notFound();
  }
  const { entity } = row;

  let srdSourceName: string | null = null;
  if (entity.srdSourceId) {
    const [srdEntry] = await db.select({ name: srdEntries.name }).from(srdEntries).where(eq(srdEntries.id, entity.srdSourceId));
    srdSourceName = srdEntry?.name ?? null;
  }

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

  // Library entities live outside any campaign, so scene mentions can't
  // occur here in practice (scenes are always campaign-scoped); the
  // branch is kept for shape-parity with the campaign page and simply
  // never matches.
  const appearsIn: AppearsInRow[] = mentionRows.flatMap((row) => {
    if (row.sourceType === "scene") {
      const name = sceneNameById.get(row.sourceId);
      if (!name) return [];
      return [{ label: name, href: `/campaigns/${row.sourceId}` }];
    }
    if (row.sourceType === "entity_backstory") {
      const name = backstoryNameById.get(row.sourceId);
      if (!name) return [];
      return [{ label: `${name}'s backstory`, href: `/library/entities/${row.sourceId}` }];
    }
    return [];
  });

  return (
    <EntityDetail
      scope={{ type: "library" }}
      entity={{
        id: entity.id,
        type: entity.type as "npc" | "monster" | "item",
        name: entity.name,
        summary: entity.summary,
        data: entity.data as NpcData | MonsterData | ItemData,
        backstoryJson: entity.backstoryJson,
      }}
      srdSourceName={srdSourceName}
      copiedFrom={null}
      canSaveToLibrary={false}
      appearsIn={appearsIn}
    />
  );
}
