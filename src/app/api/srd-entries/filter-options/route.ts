import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "../../campaigns/_shared";
import { getFilterOptions } from "@/lib/search";

const querySchema = z.object({ type: z.enum(["monster", "item"]) });

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

  const options = await getFilterOptions(parsed.data.type);
  return NextResponse.json(options);
}
