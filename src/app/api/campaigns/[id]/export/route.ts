import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { renderToBuffer } from "@react-pdf/renderer";
import { getDb } from "@/db";
import { campaigns, entities, mentions, sceneEntities, sceneLinks, scenes } from "@/db/schema";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "../../_shared";
import { requireOwnedCampaign } from "../scenes/_shared";
import { SCENE_MAPS_BUCKET } from "../scenes/[sceneId]/map-upload-url/_shared";
import { buildExportFilename } from "@/lib/export/filename";
import { computeReadingOrder } from "@/lib/export/readingOrder";
import { toGrayscalePng } from "@/lib/export/grayscale";
import { renderDocToParagraphs, resolveMentionRuns, type ResolvedParagraph } from "@/lib/export/tiptapDoc";
import {
  buildCampaignPdfDocument,
  type PdfExportData,
  type PdfItemAppendixItem,
  type PdfMonsterAppendixItem,
  type PdfNpcAppendixItem,
  type PdfScene,
  type PdfSceneEntityRef,
} from "@/lib/export/PdfDocument";
import type { EntityType } from "@/lib/entities/schemas";
import type { ItemData, MonsterData, NpcData } from "@/lib/export/entityTypes";

const ENTITY_IMAGES_BUCKET = "entity-images";

const SCENE_STATUS_LABEL: Record<string, string> = {
  not_run: "Not run yet",
  running: "Running",
  completed: "Completed",
  skipped: "Skipped",
};

interface EntityRow {
  id: string;
  type: EntityType;
  name: string;
  summary: string;
  data: unknown;
  backstoryJson: unknown;
  imagePath: string | null;
  deletedAt: Date | null;
}

async function fetchGrayscaleImage(
  bucket: string,
  path: string,
  warnings: string[],
  context: string,
): Promise<Buffer | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage.from(bucket).download(path);
    if (error || !data) {
      warnings.push(`${context}: could not read image (${error?.message ?? "not found"})`);
      return null;
    }
    const bytes = new Uint8Array(await data.arrayBuffer());
    return await toGrayscalePng(bytes);
  } catch (error) {
    warnings.push(`${context}: image processing failed (${error instanceof Error ? error.message : "unknown error"})`);
    return null;
  }
}

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

  const db = getDb();

  const [campaignRow, sceneRows, linkRows, entityRows] = await Promise.all([
    db
      .select({ title: campaigns.title, premise: campaigns.premise, notesJson: campaigns.notesJson })
      .from(campaigns)
      .where(eq(campaigns.id, id))
      .then((rows) => rows[0]),
    db.select().from(scenes).where(eq(scenes.campaignId, id)),
    db.select().from(sceneLinks).where(eq(sceneLinks.campaignId, id)),
    db
      .select({
        id: entities.id,
        type: entities.type,
        name: entities.name,
        summary: entities.summary,
        data: entities.data,
        backstoryJson: entities.backstoryJson,
        imagePath: entities.imagePath,
        deletedAt: entities.deletedAt,
      })
      .from(entities)
      .where(eq(entities.campaignId, id)),
  ]);

  if (!campaignRow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const sceneIds = sceneRows.map((scene) => scene.id);
  const [sceneMentionRows, manualRows] = await Promise.all([
    db
      .select({ entityId: mentions.entityId, sceneId: mentions.sourceId })
      .from(mentions)
      .where(and(eq(mentions.campaignId, id), eq(mentions.sourceType, "scene"))),
    sceneIds.length === 0
      ? Promise.resolve([])
      : db
          .select({ entityId: sceneEntities.entityId, sceneId: sceneEntities.sceneId })
          .from(sceneEntities)
          .where(inArray(sceneEntities.sceneId, sceneIds)),
  ]);

  const entityById = new Map<string, EntityRow>(entityRows.map((row) => [row.id, row as EntityRow]));
  const mentionLookup = (entityId: string) => {
    const found = entityById.get(entityId);
    if (!found) return undefined;
    return { name: found.name, deleted: found.deletedAt !== null };
  };

  const warnings: string[] = [];

  function resolveField(doc: unknown, context: string): ResolvedParagraph[] {
    const paragraphs = renderDocToParagraphs(doc, {
      onUnknownNode: (nodeType) => warnings.push(`${context}: unknown node type "${nodeType}"`),
    });
    return resolveMentionRuns(paragraphs, mentionLookup);
  }

  const readingOrderIds = computeReadingOrder(
    sceneRows.map((scene) => ({ id: scene.id, sortIndex: scene.sortIndex })),
    linkRows.map((link) => ({ fromSceneId: link.fromSceneId, toSceneId: link.toSceneId })),
  );
  const sceneById = new Map(sceneRows.map((scene) => [scene.id, scene]));

  const mentionEntityIdsByScene = new Map<string, Set<string>>();
  const manualEntityIdsByScene = new Map<string, Set<string>>();
  for (const row of sceneMentionRows) {
    if (!mentionEntityIdsByScene.has(row.sceneId)) mentionEntityIdsByScene.set(row.sceneId, new Set());
    mentionEntityIdsByScene.get(row.sceneId)!.add(row.entityId);
  }
  for (const row of manualRows) {
    if (!manualEntityIdsByScene.has(row.sceneId)) manualEntityIdsByScene.set(row.sceneId, new Set());
    manualEntityIdsByScene.get(row.sceneId)!.add(row.entityId);
  }

  const pdfScenes: PdfScene[] = [];
  for (const sceneId of readingOrderIds) {
    const scene = sceneById.get(sceneId);
    if (!scene) continue;

    const mentionIds = mentionEntityIdsByScene.get(sceneId) ?? new Set<string>();
    const manualIds = manualEntityIdsByScene.get(sceneId) ?? new Set<string>();
    const unionIds = new Set<string>([...mentionIds, ...manualIds]);
    const sidebarEntities: PdfSceneEntityRef[] = Array.from(unionIds)
      .map((entityId) => entityById.get(entityId))
      .filter((entity): entity is EntityRow => Boolean(entity))
      .map((entity) => ({ name: entity.name, type: entity.type, deleted: entity.deletedAt !== null }))
      .sort((a, b) => a.name.localeCompare(b.name));

    let mapImage: Buffer | null = null;
    if (scene.mapImagePath) {
      mapImage = await fetchGrayscaleImage(
        SCENE_MAPS_BUCKET,
        scene.mapImagePath,
        warnings,
        `Scene "${scene.name}" map`,
      );
    }

    pdfScenes.push({
      id: scene.id,
      name: scene.name,
      statusLabel: SCENE_STATUS_LABEL[scene.status] ?? scene.status,
      start: resolveField(scene.startJson, `Scene "${scene.name}" start`),
      narration: resolveField(scene.narrationJson, `Scene "${scene.name}" narration`),
      end: resolveField(scene.endJson, `Scene "${scene.name}" end`),
      mapImage,
      sidebarEntities,
    });
  }

  const activeEntities = entityRows.filter((row) => row.deletedAt === null).sort((a, b) => a.name.localeCompare(b.name));

  const npcs: PdfNpcAppendixItem[] = [];
  const monsters: PdfMonsterAppendixItem[] = [];
  const items: PdfItemAppendixItem[] = [];

  for (const entity of activeEntities) {
    let image: Buffer | null = null;
    if (entity.imagePath) {
      image = await fetchGrayscaleImage(
        ENTITY_IMAGES_BUCKET,
        entity.imagePath,
        warnings,
        `Entity "${entity.name}" image`,
      );
    }

    if (entity.type === "npc") {
      npcs.push({
        kind: "npc",
        id: entity.id,
        name: entity.name,
        summary: entity.summary,
        image,
        data: (entity.data ?? {}) as NpcData,
        backstory: resolveField(entity.backstoryJson, `Entity "${entity.name}" backstory`),
      });
    } else if (entity.type === "monster") {
      monsters.push({
        kind: "monster",
        id: entity.id,
        name: entity.name,
        summary: entity.summary,
        image,
        data: (entity.data ?? {}) as MonsterData,
      });
    } else {
      items.push({
        kind: "item",
        id: entity.id,
        name: entity.name,
        summary: entity.summary,
        image,
        data: (entity.data ?? {}) as ItemData,
      });
    }
  }

  const premiseParagraphs = (campaignRow.premise ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const notes = resolveField(campaignRow.notesJson, "Campaign notes");

  const exportData: PdfExportData = {
    campaignTitle: campaignRow.title,
    premiseParagraphs,
    scenes: pdfScenes,
    npcs,
    monsters,
    items,
    notes,
  };

  const buffer = await renderToBuffer(buildCampaignPdfDocument(exportData));
  const filename = buildExportFilename(campaignRow.title);

  if (warnings.length > 0) {
    console.warn(`PDF export for campaign ${id} encountered warnings:`, warnings);
  }

  // Consumed by nothing in the UI today, per this step's requirement that
  // unknown rich-text node types are reported rather than silently
  // dropped: the response is a raw PDF stream, so a header is the only
  // channel available to carry this alongside the file itself.
  const headers = new Headers({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${filename}"`,
  });
  if (warnings.length > 0) {
    headers.set("X-Export-Warnings", JSON.stringify(warnings));
  }

  return new NextResponse(new Uint8Array(buffer), { headers });
}

export const runtime = "nodejs";
