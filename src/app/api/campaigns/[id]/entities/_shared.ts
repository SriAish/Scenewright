import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { campaigns } from "@/db/schema";

export const entityTypeSchema = z.enum(["npc", "monster", "item"]);
export type EntityType = z.infer<typeof entityTypeSchema>;

/*
  Ability scores: "six stats, integers, optional as a group" per the
  build instructions, shared between NPCs and monsters. The group
  itself is optional; if present, all six are required integers
  (no partial score sets, since a stat block with some stats missing
  is not a meaningful intermediate state).
*/
const abilityScoresSchema = z.object({
  str: z.number().int(),
  dex: z.number().int(),
  con: z.number().int(),
  int: z.number().int(),
  wis: z.number().int(),
  cha: z.number().int(),
});

const npcDataSchema = z
  .object({
    description: z.string().optional(),
    personalityTraits: z.string().optional(),
    abilityScores: abilityScoresSchema.optional(),
    // Plain text for now: mentions and generation-wired relationships
    // are later build steps, per the entity generation docs.
    relationships: z.string().optional(),
    alignmentTendencies: z.string().optional(),
  })
  .strict();

const monsterActionSchema = z.object({
  name: z.string(),
  description: z.string(),
});

const monsterDataSchema = z
  .object({
    cr: z.string().optional(),
    type: z.string().optional(),
    size: z.string().optional(),
    ac: z.number().int().optional(),
    hp: z.number().int().optional(),
    speeds: z.string().optional(),
    abilities: abilityScoresSchema.optional(),
    actions: z.array(monsterActionSchema).optional(),
    // Not in the build instructions' field list, but present on the
    // matching entity-detail design frame (monster variant); included
    // to match the frame per the design-source instruction.
    description: z.string().optional(),
  })
  .strict();

const itemDataSchema = z
  .object({
    rarity: z.string().optional(),
    category: z.string().optional(),
    attunement: z.boolean().optional(),
    description: z.string().optional(),
  })
  .strict();

export const entityDataSchemas: Record<EntityType, z.ZodTypeAny> = {
  npc: npcDataSchema,
  monster: monsterDataSchema,
  item: itemDataSchema,
};

export const createEntitySchema = z.object({
  type: entityTypeSchema,
  name: z.string().trim().min(1, "Name is required"),
});

export const updateEntitySchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").optional(),
    summary: z.string().trim().optional(),
    data: z.record(z.string(), z.unknown()).optional(),
    // NPC only; enforced against the entity's actual type in the route handler.
    backstoryJson: z.unknown().optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "At least one field is required",
  });

/*
  Entities carry no user_id of their own on read paths that already
  scope by campaign; ownership is enforced through the parent campaign,
  matching scenes/_shared.ts's requireOwnedCampaign.
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
