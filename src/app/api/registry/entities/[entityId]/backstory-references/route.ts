import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { campaigns, entities } from "@/db/schema";
import { requireUser } from "@/app/api/campaigns/_shared";
import { computeCrossScopeReferences } from "@/lib/fork";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/*
  Read-only preview for screen 12's confirm step and Save-to-library:
  which of this entity's backstory-mentioned entities are outside the
  given target scope, before the fork actually runs. The fork itself
  re-runs this same check fresh inside its transaction rather than
  trusting this preview.
*/
export async function GET(request: Request, { params }: { params: Promise<{ entityId: string }> }) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { entityId } = await params;
  const target = new URL(request.url).searchParams.get("target");
  if (!target || (target !== "library" && !UUID_RE.test(target))) {
    return NextResponse.json({ error: 'target must be a campaign id or "library"' }, { status: 400 });
  }
  const targetCampaignId = target === "library" ? null : target;

  const db = getDb();

  const [source] = await db
    .select({ backstoryJson: entities.backstoryJson })
    .from(entities)
    .where(and(eq(entities.id, entityId), eq(entities.userId, user.id), isNull(entities.deletedAt)));
  if (!source) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (targetCampaignId) {
    const [campaign] = await db
      .select({ id: campaigns.id })
      .from(campaigns)
      .where(and(eq(campaigns.id, targetCampaignId), eq(campaigns.userId, user.id), isNull(campaigns.deletedAt)));
    if (!campaign) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  const references = await computeCrossScopeReferences(db, source.backstoryJson, targetCampaignId);
  return NextResponse.json({ names: references.map((reference) => reference.name) });
}
