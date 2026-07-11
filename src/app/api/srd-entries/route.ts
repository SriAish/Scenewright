import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "../campaigns/_shared";
import { browseSrdEntries, searchSrdEntries, type ItemFilters, type MonsterFilters } from "@/lib/search";

/*
  SRD search endpoint, screen 11's finder modal. Not campaign-scoped: the
  SRD corpus has no owner, only "add to campaign" (a separate route)
  needs a campaign id. Auth-gated same as everything else, matching
  srd_entries' RLS policy (select for any authenticated user).
*/

const boolStringSchema = z.enum(["true", "false"]);

const querySchema = z.object({
  type: z.enum(["monster", "item"]),
  prose: z.string().optional(),
  browse: boolStringSchema.optional(),
  limit: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  crMin: z.coerce.number().optional(),
  crMax: z.coerce.number().optional(),
  monsterType: z.string().optional(),
  size: z.string().optional(),
  environment: z.string().optional(),
  alignment: z.string().optional(),
  rarity: z.string().optional(),
  category: z.string().optional(),
  attunement: boolStringSchema.optional(),
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
  const q = parsed.data;

  const filters: MonsterFilters | ItemFilters =
    q.type === "monster"
      ? { crMin: q.crMin, crMax: q.crMax, monsterType: q.monsterType, size: q.size, environment: q.environment, alignment: q.alignment }
      : { rarity: q.rarity, category: q.category, attunement: q.attunement === undefined ? undefined : q.attunement === "true" };

  if (q.browse === "true") {
    const result = await browseSrdEntries({ type: q.type, filters, page: q.page, pageSize: q.pageSize });
    return NextResponse.json(result);
  }

  const result = await searchSrdEntries({ type: q.type, filters, prose: q.prose, limit: q.limit });
  return NextResponse.json(result);
}
