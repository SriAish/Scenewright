import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "../../../_shared";
import { ForkNotFoundError, srdAdd } from "@/lib/fork";

const bodySchema = z.object({ srdEntryId: z.string().uuid() });

/*
  Screen 11's "Add to campaign". Ownership of the target campaign is
  checked inside srdAdd itself (it needs the campaign row regardless, to
  enforce the second-user-isolation rule at the single point that owns
  the insert), so this route doesn't duplicate that check.
*/
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const created = await srdAdd({ srdEntryId: parsed.data.srdEntryId, campaignId: id, userId: user.id });
    return NextResponse.json({ ...created, sceneCount: 0 }, { status: 201 });
  } catch (error) {
    if (error instanceof ForkNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}
