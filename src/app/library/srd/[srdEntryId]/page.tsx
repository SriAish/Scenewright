import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { srdEntries } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { mapItemData, mapMonsterData } from "@/lib/srd/mapping";
import { SrdEntryDetail } from "@/components/library/SrdEntryDetail";

/*
  Read-only SRD reference detail, screen 13's SRD source view. srd_entries
  is auth-gated (any authenticated user may read it, per its RLS policy)
  and not scoped to a campaign or the caller's own rows, unlike every
  other detail page in this app; the smaller-diff read-only stat view
  described in the build instructions, not a read-only mode threaded
  through the editable EntityDetail component.
*/
export default async function SrdEntryDetailPage({
  params,
}: {
  params: Promise<{ srdEntryId: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { srdEntryId } = await params;
  const db = getDb();

  const [entry] = await db.select().from(srdEntries).where(eq(srdEntries.id, srdEntryId));
  if (!entry) {
    notFound();
  }

  const type = entry.type as "monster" | "item";
  const data = type === "monster" ? mapMonsterData(entry) : mapItemData(entry);

  return <SrdEntryDetail srdEntryId={entry.id} type={type} name={entry.name} data={data} />;
}
