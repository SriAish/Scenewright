import { notFound, redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { campaigns } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

/*
  Temporary placeholder. The real campaign view (shell, tab bar,
  scenes/characters/monsters/items/notes) is a later build step; this
  step only needs a valid landing target for "New campaign" and
  clicking a dashboard card.
*/
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
    .select({ title: campaigns.title })
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.userId, user.id), isNull(campaigns.deletedAt)));

  if (!campaign) {
    notFound();
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface-canvas px-lg">
      <div className="w-full max-w-[480px] bg-surface-card-solid border border-border-default rounded-md shadow-card p-xl flex flex-col gap-sm text-center">
        <h1 className="font-display italic font-semibold text-[22px] text-text-primary">
          {campaign.title}
        </h1>
        <p className="text-ui text-text-secondary">
          The campaign view is not built yet. This placeholder will become the scenes,
          characters, monsters, items, and notes tabs in a later build step.
        </p>
      </div>
    </main>
  );
}
