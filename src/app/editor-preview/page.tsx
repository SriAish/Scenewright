"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Toggle } from "@/components/ui";
import { useCampaigns } from "@/hooks/useCampaigns";
import { campaignScope } from "@/hooks/useEntities";
import { useCreateScene } from "@/hooks/useCreateScene";
import { useScenes } from "@/hooks/useScenes";
import { useUpdateScene } from "@/hooks/useUpdateScene";

/*
  Temporary harness for the shared MentionEditor, like /design-preview:
  not part of app navigation, removed once a real screen adopts the
  editor (step 12, the scene editor rebuild).

  Persistence choice (build instructions ask to pick and note): the
  editor is bound to a real scratch scene's narrationJson field, created
  on demand in the chosen campaign, saved through the actual scene PATCH
  route rather than a bespoke harness endpoint. Chosen over an in-memory
  doc + manual save because it's the only way to exercise the full
  save-and-mention-rebuild path (the thing this step needs verified)
  without duplicating that route.
*/

const SCRATCH_SCENE_NAME = "Editor preview scratch";

const MentionEditor = dynamic(() => import("@/components/editor/MentionEditor").then((mod) => mod.MentionEditor), {
  ssr: false,
  loading: () => <div className="text-ui text-text-secondary px-lg py-base">Loading editor…</div>,
});

export default function EditorPreviewPage() {
  return (
    <Suspense fallback={null}>
      <EditorPreviewInner />
    </Suspense>
  );
}

function EditorPreviewInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignId = searchParams.get("campaignId");

  const { data: campaigns, isLoading: campaignsLoading } = useCampaigns();

  function selectCampaign(id: string) {
    router.push(`/editor-preview?campaignId=${id}`);
  }

  return (
    <main className="max-w-[820px] mx-auto px-xl py-[48px] flex flex-col gap-xl">
      <header>
        <h1 className="font-display italic font-semibold text-[28px] text-text-primary mb-sm">
          Editor preview
        </h1>
        <p className="text-ui text-text-secondary leading-[1.5]">
          Temporary review route for the shared MentionEditor (rich text with @ / [[ entity mentions). Not
          part of the app&apos;s navigation. Saves go through the real scene save-and-mention-rebuild path.
        </p>
      </header>

      <div className="flex items-center gap-sm">
        <span className="text-label font-semibold uppercase tracking-wider text-text-label">Campaign</span>
        <select
          value={campaignId ?? ""}
          onChange={(event) => selectCampaign(event.target.value)}
          className="text-ui text-text-primary bg-surface-card border border-border-soft rounded-sm px-sm py-[6px] outline-none"
        >
          <option value="" disabled>
            {campaignsLoading ? "Loading campaigns…" : "Select a campaign…"}
          </option>
          {campaigns?.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.title}
            </option>
          ))}
        </select>
      </div>

      {campaignId && <ScratchSceneEditor campaignId={campaignId} />}
    </main>
  );
}

function ScratchSceneEditor({ campaignId }: { campaignId: string }) {
  const { data: scenes, isLoading } = useScenes(campaignId);
  const createScene = useCreateScene(campaignId);
  const updateScene = useUpdateScene(campaignId);

  const scratchScene = scenes?.find((scene) => scene.name === SCRATCH_SCENE_NAME);

  useEffect(() => {
    if (!isLoading && scenes && !scratchScene && !createScene.isPending) {
      createScene.mutate({ name: SCRATCH_SCENE_NAME });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, scenes, scratchScene]);

  const [readOnly, setReadOnly] = useState(false);
  const [draft, setDraft] = useState<unknown>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  // Only resets to the server value when the scene identity changes, not on
  // every background refetch of scratchScene, so a background invalidation
  // (e.g. after saving) can't clobber unsaved local edits with a stale read.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const draftForScene = useMemo(() => draft ?? scratchScene?.narrationJson ?? null, [draft, scratchScene?.id]);

  function saveNow() {
    if (!scratchScene) return;
    updateScene.mutate(
      { id: scratchScene.id, narrationJson: draftForScene },
      { onSuccess: () => { setSavedNotice(true); setTimeout(() => setSavedNotice(false), 2000); } },
    );
  }

  if (isLoading || !scratchScene) {
    return <p className="text-ui text-text-secondary">Setting up the scratch scene…</p>;
  }

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-center gap-md">
        <Toggle checked={readOnly} onChange={setReadOnly} label="Read-only mode" />
        <span className="text-ui text-text-secondary">Read-only mode</span>
        <div className="flex-1" />
        {savedNotice && <span className="text-micro text-text-secondary">Saved</span>}
        <Button variant="primary" size="sm" onClick={saveNow} disabled={updateScene.isPending}>
          {updateScene.isPending ? "Saving…" : "Save now"}
        </Button>
      </div>

      <MentionEditor
        key={scratchScene.id}
        scope={campaignScope(campaignId)}
        value={scratchScene.narrationJson}
        readOnly={readOnly}
        label="Narration (scratch scene)"
        placeholder="Write the scene. Type @ or [[ to mention a character, monster, or item…"
        onChange={setDraft}
        onSave={(doc) => updateScene.mutate({ id: scratchScene.id, narrationJson: doc })}
        saveDebounceMs={1200}
      />

      <div className="text-micro text-text-secondary leading-[1.6] bg-surface-card border border-border-soft rounded-lg px-md py-sm">
        States reachable from here: empty (this field starts empty on a fresh scratch scene), populated
        (type anything), mentions of all three types (@ or [[ each type at least once), read-only (toggle
        above), and a soft-deleted mention (mention an entity, open it from its chip, delete it from its
        detail page, then come back — the chip renders greyed).
      </div>
    </div>
  );
}
