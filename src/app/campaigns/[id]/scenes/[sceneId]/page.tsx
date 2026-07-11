import { notFound, redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { campaigns, scenes } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { SceneEditor } from "@/components/scenes/SceneEditor";

/*
  Auth and existence/ownership check only, matching CampaignShell's
  pattern: the client component owns its own data fetching (useScene)
  so field-level autosave can invalidate and refetch without a full
  page reload.
*/
export default async function ScenePage({
  params,
}: {
  params: Promise<{ id: string; sceneId: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { id, sceneId } = await params;
  const db = getDb();

  const [campaign] = await db
    .select({ id: campaigns.id, title: campaigns.title })
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.userId, user.id), isNull(campaigns.deletedAt)));

  if (!campaign) {
    notFound();
  }

  const [scene] = await db.select({ id: scenes.id }).from(scenes).where(and(eq(scenes.id, sceneId), eq(scenes.campaignId, id)));

  if (!scene) {
    notFound();
  }

  return <SceneEditor campaignId={campaign.id} campaignTitle={campaign.title} sceneId={scene.id} />;
}
