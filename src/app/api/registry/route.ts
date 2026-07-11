import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/app/api/campaigns/_shared";
import { entityTypeSchema } from "@/lib/entities/schemas";
import { searchRegistry } from "@/lib/registry";

/*
  Lineage registry search, screen 12's import modal (and any future
  registry-browse screen): all of the user's entities across campaigns
  and the library, grouped by lineage. See src/lib/registry/index.ts.
*/

const querySchema = z.object({
  type: entityTypeSchema.optional(),
  q: z.string().trim().optional(),
  excludeCampaignId: z.string().uuid().optional(),
});

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const groups = await searchRegistry({
    userId: user.id,
    type: parsed.data.type,
    query: parsed.data.q,
    includeDeletedCampaigns: url.searchParams.get("includeDeletedCampaigns") === "true",
    excludeCampaignId: parsed.data.excludeCampaignId,
  });

  return NextResponse.json(groups);
}
