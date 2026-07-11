import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { entities } from "@/db/schema";
import { requireUser } from "@/app/api/campaigns/_shared";
import { ForkNotFoundError, crossCampaignImport, libraryImport } from "@/lib/fork";

/*
  Screen 12's "Import copy": the registry's search results mix
  campaign-sourced and library-sourced variants in one list, so this one
  route dispatches to the right fork function based on the chosen
  variant's own scope rather than making the client know which fork
  function to call.
*/

const bodySchema = z.object({
  variantId: z.string().uuid(),
  targetCampaignId: z.string().uuid(),
  mentionStrategy: z.enum(["flatten", "copyReferenced"]),
});

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = getDb();
  const [source] = await db
    .select({ campaignId: entities.campaignId })
    .from(entities)
    .where(eq(entities.id, parsed.data.variantId));

  try {
    const created =
      source?.campaignId === null
        ? await libraryImport({
            sourceEntityId: parsed.data.variantId,
            targetCampaignId: parsed.data.targetCampaignId,
            userId: user.id,
            mentionStrategy: parsed.data.mentionStrategy,
          })
        : await crossCampaignImport({
            sourceEntityId: parsed.data.variantId,
            targetCampaignId: parsed.data.targetCampaignId,
            userId: user.id,
            mentionStrategy: parsed.data.mentionStrategy,
          });
    return NextResponse.json({ ...created, sceneCount: 0 }, { status: 201 });
  } catch (error) {
    if (error instanceof ForkNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}
