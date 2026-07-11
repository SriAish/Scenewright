/*
  Manual verification for the fork service and lineage registry (build
  step 14: cross-campaign import, library, save-to-library, lineage
  registry). Run with:

    npx tsx scripts/verify/fork-lineage-check.ts

  Creates two throwaway users via the admin API (auth lifecycle only,
  matching rls-check.ts's pattern), then calls the fork service and
  registry query modules directly against the app's DB connection
  (which is not RLS-scoped, same as every other server-side call site
  in this codebase) to set up fixtures and assert behavior:
  - flat lineage across a fork-of-a-fork chain, data taken from the
    variant forked, not the root
  - soft-deleted-campaign hiding in the registry and the toggle
  - backstory flatten (plain text, no mention node, no mentions row)
    and copy (id remapped to the new copy, referenced entity forked
    one level deep with correct lineage, accurate reference count)
  - save-to-library visibility keyed on lineage across all variants
  - second-user isolation on all three fork functions and the registry
  Deletes all test rows and users afterward, including on failure.
*/

import { createClient } from "@supabase/supabase-js";
import { eq, inArray, or } from "drizzle-orm";
import { getDb } from "@/db";
import { campaigns, entities, mentions } from "@/db/schema";
import {
  ForkNotFoundError,
  computeCrossScopeReferences,
  crossCampaignImport,
  libraryImport,
  saveToLibrary,
} from "@/lib/fork";
import { hasLibraryVariant, searchRegistry } from "@/lib/registry";

process.loadEnvFile(".env.local");

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!rawUrl || !anonKey || !serviceKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY");
}

const url = new URL(rawUrl).origin;
const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const db = getDb();

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

function mentionDoc(text: string, mentionedId: string) {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: `${text} ` },
          { type: "mention", attrs: { id: mentionedId, entityType: "npc" } },
          { type: "text", text: "." },
        ],
      },
    ],
  };
}

function hasMentionNode(doc: unknown): boolean {
  if (typeof doc !== "object" || doc === null) return false;
  const node = doc as { type?: string; content?: unknown[] };
  if (node.type === "mention") return true;
  if (Array.isArray(node.content)) return node.content.some(hasMentionNode);
  return false;
}

function mentionIds(doc: unknown): string[] {
  if (typeof doc !== "object" || doc === null) return [];
  const node = doc as { type?: string; attrs?: { id?: unknown }; content?: unknown[] };
  const ids: string[] = [];
  if (node.type === "mention" && typeof node.attrs?.id === "string") ids.push(node.attrs.id);
  if (Array.isArray(node.content)) for (const child of node.content) ids.push(...mentionIds(child));
  return ids;
}

async function main() {
  const suffix = Math.random().toString(36).slice(2, 10);
  const emailA = `scenewright-verify-fork-a-${suffix}@example.com`;
  const emailB = `scenewright-verify-fork-b-${suffix}@example.com`;
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

  const campaignIds: string[] = [];
  const entityIds: string[] = [];

  try {
    console.log("Setting up campaigns and a root NPC...");
    const [camp1, camp2, camp3] = await db
      .insert(campaigns)
      .values([
        { userId: userA.id, title: "Verify Campaign 1", status: "draft", notesJson: {} },
        { userId: userA.id, title: "Verify Campaign 2", status: "draft", notesJson: {} },
        { userId: userA.id, title: "Verify Campaign 3", status: "draft", notesJson: {} },
      ])
      .returning();
    campaignIds.push(camp1.id, camp2.id, camp3.id);

    const [campB] = await db
      .insert(campaigns)
      .values({ userId: userB.id, title: "Verify Campaign B", status: "draft", notesJson: {} })
      .returning();
    campaignIds.push(campB.id);

    const [elenna] = await db
      .insert(entities)
      .values({
        userId: userA.id,
        campaignId: camp1.id,
        type: "npc",
        name: "Elenna",
        summary: "A root NPC.",
        data: {},
        backstoryJson: null,
      })
      .returning();
    entityIds.push(elenna.id);

    console.log("Forking Elenna into campaign 2...");
    const copy2 = await crossCampaignImport({
      sourceEntityId: elenna.id,
      targetCampaignId: camp2.id,
      userId: userA.id,
      mentionStrategy: "flatten",
    });
    entityIds.push(copy2.id);
    assert(copy2.campaignId === camp2.id, "copy2 should live in campaign 2");
    assert(copy2.lineageRootId === elenna.id, "copy2's lineage root should be Elenna");
    assert(copy2.name === elenna.name, "copy2 should start with Elenna's data");

    await db.update(entities).set({ summary: "Edited independently on copy2." }).where(eq(entities.id, copy2.id));
    const [freshElenna] = await db.select().from(entities).where(eq(entities.id, elenna.id));
    assert(freshElenna.summary === "A root NPC.", "editing the copy must not affect the source (independent data)");

    console.log("Forking the fork (campaign 2 -> campaign 3)...");
    await db.update(entities).set({ name: "Elenna's Doppelganger" }).where(eq(entities.id, copy2.id));
    const [copy2Renamed] = await db.select().from(entities).where(eq(entities.id, copy2.id));
    const copy3 = await crossCampaignImport({
      sourceEntityId: copy2.id,
      targetCampaignId: camp3.id,
      userId: userA.id,
      mentionStrategy: "flatten",
    });
    entityIds.push(copy3.id);
    assert(copy3.lineageRootId === elenna.id, "copy3's lineage root should stay the ORIGINAL root, flat (not copy2)");
    assert(copy3.name === copy2Renamed.name, "copy3's data should come from the variant forked (copy2), not the root");

    console.log("Checking registry grouping (3 variants, one header)...");
    const registryBefore = await searchRegistry({ userId: userA.id, type: "npc", includeDeletedCampaigns: false });
    const groupBefore = registryBefore.find((group) => group.effectiveRootId === elenna.id);
    assert(groupBefore, "registry should have a group for Elenna's lineage");
    assert(groupBefore.versionCount === 3, `expected version count 3, got ${groupBefore?.versionCount}`);
    const sourceLabels = new Set(groupBefore.variants.map((variant) => variant.sourceLabel));
    assert(sourceLabels.has("Verify Campaign 1") && sourceLabels.has("Verify Campaign 2") && sourceLabels.has("Verify Campaign 3"), "version picker should show all three source labels");

    console.log("Soft-deleting campaign 2 and checking the toggle...");
    await db.update(campaigns).set({ deletedAt: new Date() }).where(eq(campaigns.id, camp2.id));
    const hiddenRegistry = await searchRegistry({ userId: userA.id, type: "npc", includeDeletedCampaigns: false });
    const hiddenGroup = hiddenRegistry.find((group) => group.effectiveRootId === elenna.id);
    assert(hiddenGroup && hiddenGroup.versionCount === 2, "campaign 2's variant should hide by default");
    const revealedRegistry = await searchRegistry({ userId: userA.id, type: "npc", includeDeletedCampaigns: true });
    const revealedGroup = revealedRegistry.find((group) => group.effectiveRootId === elenna.id);
    assert(revealedGroup && revealedGroup.versionCount === 3, "the toggle should reveal campaign 2's variant, lineage grouping intact");

    console.log("Setting up a backstory-mention fixture...");
    const [bramwell] = await db
      .insert(entities)
      .values({ userId: userA.id, campaignId: camp1.id, type: "npc", name: "Bramwell", summary: "", data: {}, backstoryJson: null })
      .returning();
    entityIds.push(bramwell.id);

    const [storyteller] = await db
      .insert(entities)
      .values({
        userId: userA.id,
        campaignId: camp1.id,
        type: "npc",
        name: "Storyteller",
        summary: "",
        data: {},
        backstoryJson: mentionDoc("Friends with", bramwell.id),
      })
      .returning();
    entityIds.push(storyteller.id);

    console.log("Checking the backstory-reference preview...");
    const preview = await computeCrossScopeReferences(db, storyteller.backstoryJson, camp3.id);
    assert(preview.length === 1 && preview[0].name === "Bramwell", "preview should report exactly Bramwell, accurate N-count of 1");

    console.log("Importing with mentionStrategy 'flatten'...");
    const flattenedCopy = await crossCampaignImport({
      sourceEntityId: storyteller.id,
      targetCampaignId: camp3.id,
      userId: userA.id,
      mentionStrategy: "flatten",
    });
    entityIds.push(flattenedCopy.id);
    assert(!hasMentionNode(flattenedCopy.backstoryJson), "flatten should leave no mention node");
    const flattenedText = JSON.stringify(flattenedCopy.backstoryJson);
    assert(flattenedText.includes("Bramwell"), "flatten should show Bramwell's current name as plain text");
    const [flattenedMentionRow] = await db
      .select()
      .from(mentions)
      .where(eq(mentions.sourceId, flattenedCopy.id));
    assert(!flattenedMentionRow, "flatten should leave no mentions row for the removed reference");

    console.log("Importing with mentionStrategy 'copyReferenced' (no dedup on repeated imports)...");
    const copiedCopy = await crossCampaignImport({
      sourceEntityId: storyteller.id,
      targetCampaignId: camp3.id,
      userId: userA.id,
      mentionStrategy: "copyReferenced",
    });
    entityIds.push(copiedCopy.id);
    const remappedIds = mentionIds(copiedCopy.backstoryJson);
    assert(remappedIds.length === 1, "copy strategy should still have exactly one mention node");
    const newBramwellId = remappedIds[0];
    assert(newBramwellId !== bramwell.id, "the mention id must be remapped to the NEW copy's id, not the source id");
    entityIds.push(newBramwellId);
    const [newBramwell] = await db.select().from(entities).where(eq(entities.id, newBramwellId));
    assert(newBramwell.campaignId === camp3.id, "the referenced entity should be forked into the target campaign");
    assert(newBramwell.lineageRootId === bramwell.id, "the referenced entity's lineage root should be the original Bramwell");
    const [mentionRow] = await db
      .select()
      .from(mentions)
      .where(eq(mentions.sourceId, copiedCopy.id));
    assert(mentionRow && mentionRow.entityId === newBramwellId, "a mentions row should point at the NEW copy's id");

    console.log("Checking Save-to-library visibility, keyed on lineage across variants...");
    assert(!(await hasLibraryVariant(userA.id, elenna.id)), "no library variant should exist yet");
    const libraryCopy = await saveToLibrary({ sourceEntityId: elenna.id, userId: userA.id, mentionStrategy: "flatten" });
    entityIds.push(libraryCopy.id);
    assert(libraryCopy.campaignId === null, "save-to-library should land in library scope (campaign_id null)");
    assert(libraryCopy.lineageRootId === elenna.id, "the library copy's lineage root should be Elenna");
    assert(await hasLibraryVariant(userA.id, elenna.id), "a library variant should now exist");
    assert(
      await hasLibraryVariant(userA.id, copy3.lineageRootId ?? copy3.id),
      "visibility is keyed on the whole lineage: copy3 (a different variant) should also report a library variant now",
    );

    console.log("Importing from the library back into a campaign...");
    const libraryImportedCopy = await libraryImport({
      sourceEntityId: libraryCopy.id,
      targetCampaignId: camp1.id,
      userId: userA.id,
      mentionStrategy: "flatten",
    });
    entityIds.push(libraryImportedCopy.id);
    assert(libraryImportedCopy.campaignId === camp1.id, "library import should land in the target campaign");
    assert(libraryImportedCopy.lineageRootId === elenna.id, "lineage root stays flat through a library round-trip");

    console.log("Checking second-user isolation on all three fork functions and the registry...");
    await assertThrowsForkNotFound(
      () => crossCampaignImport({ sourceEntityId: elenna.id, targetCampaignId: camp1.id, userId: userB.id, mentionStrategy: "flatten" }),
      "crossCampaignImport must reject a cross-user source",
    );
    await assertThrowsForkNotFound(
      () => crossCampaignImport({ sourceEntityId: elenna.id, targetCampaignId: campB.id, userId: userA.id, mentionStrategy: "flatten" }),
      "crossCampaignImport must reject a cross-user target",
    );
    await assertThrowsForkNotFound(
      () => libraryImport({ sourceEntityId: libraryCopy.id, targetCampaignId: camp1.id, userId: userB.id, mentionStrategy: "flatten" }),
      "libraryImport must reject a cross-user source",
    );
    await assertThrowsForkNotFound(
      () => saveToLibrary({ sourceEntityId: elenna.id, userId: userB.id, mentionStrategy: "flatten" }),
      "saveToLibrary must reject a cross-user source",
    );
    const userBRegistry = await searchRegistry({ userId: userB.id, includeDeletedCampaigns: true });
    assert(
      userBRegistry.every((group) => group.headerName !== "Elenna"),
      "the registry must never return another user's entities",
    );

    console.log("All assertions passed.");
  } finally {
    console.log("Cleaning up...");
    if (entityIds.length > 0) {
      await db.delete(mentions).where(or(inArray(mentions.entityId, entityIds), inArray(mentions.sourceId, entityIds)));
      await db.delete(entities).where(inArray(entities.id, entityIds));
    }
    if (campaignIds.length > 0) {
      await db.delete(campaigns).where(inArray(campaigns.id, campaignIds));
    }
    await admin.auth.admin.deleteUser(userA.id);
    await admin.auth.admin.deleteUser(userB.id);
    console.log("Cleanup complete.");
  }
}

async function assertThrowsForkNotFound(fn: () => Promise<unknown>, message: string): Promise<void> {
  try {
    await fn();
  } catch (error) {
    if (error instanceof ForkNotFoundError) return;
    throw error;
  }
  throw new Error(`ASSERTION FAILED: ${message} (no error was thrown)`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
