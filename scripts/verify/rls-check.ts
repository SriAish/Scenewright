/*
  Manual verification script for the database layer's row level security.
  Not part of the application. Run with:

    npx tsx scripts/verify/rls-check.ts

  Creates two throwaway users via the admin API, inserts a campaign,
  scene, and entity as user A, then asserts user B cannot read or write
  any of it while user A can read their own rows. Also asserts
  srd_entries is readable by an authenticated user and not writable.
  Deletes the test rows and users afterward, including on failure.
*/

import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(".env.local");

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!rawUrl || !anonKey || !serviceKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY");
}

// NEXT_PUBLIC_SUPABASE_URL in .env.local carries a /rest/v1/ path; the
// supabase-js client wants just the project origin and appends its own
// /auth/v1, /rest/v1, etc. paths.
const url = new URL(rawUrl).origin;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function anonClient() {
  return createClient(url as string, anonKey as string, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function main() {
  const suffix = Math.random().toString(36).slice(2, 10);
  const emailA = `scenewright-verify-a-${suffix}@example.com`;
  const emailB = `scenewright-verify-b-${suffix}@example.com`;
  const password = `Verify-${suffix}-Aa1!`;

  console.log("Creating test users...");
  const { data: userAData, error: userAError } = await admin.auth.admin.createUser({
    email: emailA,
    password,
    email_confirm: true,
  });
  assert(!userAError && userAData.user, `create user A failed: ${userAError?.message}`);
  const userA = userAData.user;

  const { data: userBData, error: userBError } = await admin.auth.admin.createUser({
    email: emailB,
    password,
    email_confirm: true,
  });
  assert(!userBError && userBData.user, `create user B failed: ${userBError?.message}`);
  const userB = userBData.user;

  let campaignId: string | undefined;
  let sceneId: string | undefined;
  let entityId: string | undefined;

  try {
    console.log("Signing in as user A...");
    const clientA = anonClient();
    const { error: signInAError } = await clientA.auth.signInWithPassword({ email: emailA, password });
    assert(!signInAError, `sign in A failed: ${signInAError?.message}`);

    console.log("Inserting campaign, scene, and entity as user A...");
    const { data: campaign, error: campaignError } = await clientA
      .from("campaigns")
      .insert({ user_id: userA.id, title: "Verify campaign", status: "draft", notes_json: {} })
      .select()
      .single();
    assert(!campaignError && campaign, `insert campaign failed: ${campaignError?.message}`);
    campaignId = campaign.id;

    const { data: scene, error: sceneError } = await clientA
      .from("scenes")
      .insert({
        campaign_id: campaignId,
        name: "Verify scene",
        status: "not_run",
        start_json: {},
        end_json: {},
        narration_json: {},
        sort_index: 0,
      })
      .select()
      .single();
    assert(!sceneError && scene, `insert scene failed: ${sceneError?.message}`);
    sceneId = scene.id;

    const { data: entity, error: entityError } = await clientA
      .from("entities")
      .insert({
        user_id: userA.id,
        campaign_id: campaignId,
        type: "npc",
        name: "Verify NPC",
        summary: "Verification summary.",
        data: {},
      })
      .select()
      .single();
    assert(!entityError && entity, `insert entity failed: ${entityError?.message}`);
    entityId = entity.id;

    console.log("Asserting user A can read their own rows...");
    const { data: ownCampaign } = await clientA.from("campaigns").select().eq("id", campaignId);
    assert(ownCampaign?.length === 1, "user A could not read own campaign");
    const { data: ownScene } = await clientA.from("scenes").select().eq("id", sceneId);
    assert(ownScene?.length === 1, "user A could not read own scene");
    const { data: ownEntity } = await clientA.from("entities").select().eq("id", entityId);
    assert(ownEntity?.length === 1, "user A could not read own entity");

    console.log("Signing in as user B...");
    const clientB = anonClient();
    const { error: signInBError } = await clientB.auth.signInWithPassword({ email: emailB, password });
    assert(!signInBError, `sign in B failed: ${signInBError?.message}`);

    console.log("Asserting user B cannot read user A's rows...");
    const { data: bCampaign } = await clientB.from("campaigns").select().eq("id", campaignId);
    assert(bCampaign?.length === 0, "user B could read user A's campaign");
    const { data: bScene } = await clientB.from("scenes").select().eq("id", sceneId);
    assert(bScene?.length === 0, "user B could read user A's scene");
    const { data: bEntity } = await clientB.from("entities").select().eq("id", entityId);
    assert(bEntity?.length === 0, "user B could read user A's entity");

    console.log("Asserting user B cannot write to user A's rows...");
    const { error: bUpdateError } = await clientB
      .from("campaigns")
      .update({ title: "Hijacked" })
      .eq("id", campaignId);
    assert(!bUpdateError, `unexpected error on user B's update attempt: ${bUpdateError?.message}`);
    const { data: afterUpdate } = await clientA.from("campaigns").select("title").eq("id", campaignId).single();
    assert(afterUpdate?.title === "Verify campaign", "user B was able to modify user A's campaign");

    const { error: bDeleteError } = await clientB.from("campaigns").delete().eq("id", campaignId);
    assert(!bDeleteError, `unexpected error on user B's delete attempt: ${bDeleteError?.message}`);
    const { data: stillThere } = await clientA.from("campaigns").select("id").eq("id", campaignId);
    assert(stillThere?.length === 1, "campaign disappeared after user B's delete attempt");

    console.log("Asserting srd_entries is readable by an authenticated user...");
    const { error: srdSelectError } = await clientA.from("srd_entries").select().limit(1);
    assert(!srdSelectError, `srd_entries select failed for authenticated user: ${srdSelectError?.message}`);

    console.log("Asserting srd_entries is not writable by an authenticated user...");
    const { error: srdInsertError } = await clientA.from("srd_entries").insert({
      type: "monster",
      name: "Verify monster",
      data: {},
      search_text: "verify",
      embedding: new Array(384).fill(0),
    });
    assert(!!srdInsertError, "srd_entries insert unexpectedly succeeded for an authenticated user");

    console.log("All assertions passed.");
  } finally {
    console.log("Cleaning up...");
    if (entityId) await admin.from("entities").delete().eq("id", entityId);
    if (sceneId) await admin.from("scenes").delete().eq("id", sceneId);
    if (campaignId) await admin.from("campaigns").delete().eq("id", campaignId);
    await admin.auth.admin.deleteUser(userA.id);
    await admin.auth.admin.deleteUser(userB.id);
    console.log("Cleanup complete.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
