import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { campaigns } from "@/db/schema";

export const sceneStatusSchema = z.enum(["not_run", "running", "completed", "skipped"]);

export const createSceneSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
});

export const updateSceneSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").optional(),
    status: sceneStatusSchema.optional(),
    startJson: z.unknown().optional(),
    endJson: z.unknown().optional(),
    narrationJson: z.unknown().optional(),
    sortIndex: z.number().int().min(0).optional(),
    // Graph view node position; null means "not placed yet, auto-layout on next graph open".
    graphX: z.number().nullable().optional(),
    graphY: z.number().nullable().optional(),
    // Storage path in the scene-maps bucket; null clears the map. Set by
    // the client after a direct upload to a signed URL this campaign's
    // map-upload-url route issued.
    mapImagePath: z.string().nullable().optional(),
    mapSourceUrl: z.string().trim().nullable().optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "At least one field is required",
  });

export const reorderScenesSchema = z.object({
  sceneIds: z.array(z.string().uuid()).min(1),
});

/*
  Scenes carry no user_id of their own; ownership is enforced through
  the parent campaign on every request, per architecture.md's RLS
  policies (scenes_owner_all joins to campaigns on campaign_id).
*/
export async function requireOwnedCampaign(campaignId: string, userId: string) {
  const db = getDb();
  const [campaign] = await db
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId), isNull(campaigns.deletedAt)));
  return campaign ?? null;
}

// Empty ProseMirror/Tiptap document, the shape Tiptap itself produces for a blank editor.
export const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };
