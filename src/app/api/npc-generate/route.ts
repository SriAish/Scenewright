import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "../campaigns/_shared";
import { generateNpcCandidates, getGenerationOptions } from "@/lib/generation";
import { ALIGNMENTS } from "@/lib/generation/tables/alignments";
import { OCCUPATIONS } from "@/lib/generation/tables/occupations";

/*
  NPC generation: not campaign-scoped, generation is pure computation.
  "Use this one" (a separate request, the existing entity create/update
  path) is what actually writes to a campaign.
*/

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(getGenerationOptions());
}

const bodySchema = z.object({
  race: z.enum(["dragonborn", "dwarf", "elf", "gnome", "halfling", "human", "halfOrc", "halfElf", "tiefling", "aelfir"]).optional(),
  sex: z.enum(["male", "female"]).optional(),
  alignment: z.enum(ALIGNMENTS).optional(),
  occupation: z.enum(OCCUPATIONS).optional(),
  plotHooks: z.string().optional(),
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

  return NextResponse.json(generateNpcCandidates(parsed.data));
}
