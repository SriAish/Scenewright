import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/app/api/campaigns/_shared";
import { requireOwnedCampaign } from "../../_shared";
import { ForkNotFoundError, saveToLibrary } from "@/lib/fork";

const bodySchema = z.object({ mentionStrategy: z.enum(["flatten", "copyReferenced"]) });

/** Screen 9's "Save to library": reverse fork, campaign entity -> library. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; entityId: string }> },
) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, entityId } = await params;
  const campaign = await requireOwnedCampaign(id, user.id);
  if (!campaign) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const created = await saveToLibrary({
      sourceEntityId: entityId,
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
