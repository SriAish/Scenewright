import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/app/api/campaigns/_shared";
import { ForkNotFoundError, srdAddToLibrary } from "@/lib/fork";

const bodySchema = z.object({ srdEntryId: z.string().uuid() });

/*
  Library's "Add to library" for an SRD row (screen 13's SRD source
  view). userId always comes from the authenticated session, never from
  the request body, so this can only ever write into the caller's own
  library: there is no separate "target" to isolate against.
*/
export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const created = await srdAddToLibrary({ srdEntryId: parsed.data.srdEntryId, userId: user.id });
    return NextResponse.json({ ...created, sceneCount: 0 }, { status: 201 });
  } catch (error) {
    if (error instanceof ForkNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}
