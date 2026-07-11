import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { campaigns } from "@/db/schema";

export {
  entityTypeSchema,
  entityDataSchemas,
  createEntitySchema,
  updateEntitySchema,
  EMPTY_DOC,
  type EntityType,
} from "@/lib/entities/schemas";

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
