import { notFound, redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { campaigns } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { CampaignShell } from "@/components/campaign/CampaignShell";

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { id } = await params;
  const db = getDb();
  const [campaign] = await db
    .select({ title: campaigns.title, status: campaigns.status, notesJson: campaigns.notesJson })
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.userId, user.id), isNull(campaigns.deletedAt)));

  if (!campaign) {
    notFound();
  }

  return (
    <CampaignShell
      campaignId={id}
      initialTitle={campaign.title}
      initialStatus={campaign.status as "draft" | "running" | "completed"}
      initialNotesJson={campaign.notesJson}
    />
  );
}
