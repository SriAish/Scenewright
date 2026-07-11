"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { BackIcon, Button, ChevronDownIcon, CloseIcon, IconButton, StatusPill } from "@/components/ui";
import { formatRelativeTime } from "@/components/dashboard/relativeTime";
import { campaignScope } from "@/hooks/useEntities";
import { SceneDetail, useScene } from "@/hooks/useScene";
import { useUpdateScene } from "@/hooks/useUpdateScene";
import { SceneStatus } from "@/hooks/useScenes";
import { EntitySection } from "./EntitySection";
import { MapCard } from "./MapCard";
import { PredecessorsPanel } from "./PredecessorsPanel";

/*
  Dynamically imported so Tiptap only loads for routes that need it, per
  architecture.md's performance configuration. Same pattern as NotesTab.
*/
const MentionEditor = dynamic(() => import("@/components/editor/MentionEditor").then((mod) => mod.MentionEditor), {
  ssr: false,
  loading: () => <div className="text-ui text-text-secondary px-lg py-base">Loading editor...</div>,
});

const STATUS_LABEL: Record<SceneStatus, string> = {
  not_run: "Not run yet",
  running: "Running",
  completed: "Completed",
  skipped: "Skipped",
};
const STATUS_OPTIONS: SceneStatus[] = ["not_run", "running", "completed", "skipped"];

export interface SceneEditorProps {
  campaignId: string;
  campaignTitle: string;
  sceneId: string;
}

/** Scene editor, screen 7: fetches its own data (matches the shell/tab pattern) so field-level autosave can invalidate and refetch the sidebar/predecessors without a full page reload. */
export function SceneEditor({ campaignId, campaignTitle, sceneId }: SceneEditorProps) {
  const { data: scene, isLoading, isError } = useScene(campaignId, sceneId);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-ui text-text-secondary">
        Loading scene...
      </div>
    );
  }

  if (isError || !scene) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-sm text-ui text-text-secondary">
        <p>Scene not found.</p>
        <Link href={`/campaigns/${campaignId}`} className="text-accent font-medium">
          Back to {campaignTitle}
        </Link>
      </div>
    );
  }

  return <SceneEditorLoaded campaignId={campaignId} campaignTitle={campaignTitle} scene={scene} />;
}

/*
  Local name/status state is seeded once from `scene` at mount, then
  edited optimistically, matching CampaignShell's initialTitle pattern.
  This component instance persists across query refetches (same
  sceneId), so those refetches (triggered by each field's autosave)
  don't clobber in-progress header edits.
*/
function SceneEditorLoaded({
  campaignId,
  campaignTitle,
  scene,
}: {
  campaignId: string;
  campaignTitle: string;
  scene: SceneDetail;
}) {
  const updateScene = useUpdateScene(campaignId);

  const [name, setName] = useState(scene.name);
  const [isEditingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(scene.name);

  const [status, setStatus] = useState(scene.status);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!statusMenuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
        setStatusMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [statusMenuOpen]);

  function commitName() {
    setEditingName(false);
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === name) {
      setNameDraft(name);
      return;
    }
    const previous = name;
    setName(trimmed);
    updateScene.mutate({ id: scene.id, name: trimmed }, { onError: () => setName(previous) });
  }

  function changeStatus(next: SceneStatus) {
    setStatusMenuOpen(false);
    const previous = status;
    setStatus(next);
    updateScene.mutate({ id: scene.id, status: next }, { onError: () => setStatus(previous) });
  }

  function handleFieldSave(field: "startJson" | "narrationJson" | "endJson", doc: unknown) {
    updateScene.mutate(
      { id: scene.id, [field]: doc },
      { onSuccess: () => setLastSavedAt(new Date().toISOString()) },
    );
  }

  const npcs = scene.sidebarEntities.filter((entity) => entity.type === "npc");
  const monsters = scene.sidebarEntities.filter((entity) => entity.type === "monster");
  const items = scene.sidebarEntities.filter((entity) => entity.type === "item");

  return (
    <div className="min-h-screen flex flex-col bg-surface-canvas">
      <div className="flex items-center gap-md px-xl py-base border-b border-border-default bg-surface-card-solid sticky top-0 z-20">
        <Link
          href={`/campaigns/${campaignId}`}
          className="inline-flex items-center gap-sm text-ui font-medium text-text-secondary hover:bg-surface-panel rounded-sm px-sm py-[6px]"
        >
          <BackIcon />
          {campaignTitle}
        </Link>

        <div className="w-px h-[22px] bg-border-default" />

        {isEditingName ? (
          <input
            autoFocus
            value={nameDraft}
            onChange={(event) => setNameDraft(event.target.value)}
            onBlur={commitName}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
              if (event.key === "Escape") {
                setNameDraft(name);
                setEditingName(false);
              }
            }}
            className="font-display italic font-semibold text-display text-text-primary border border-border-soft bg-surface-card rounded-sm px-sm py-[4px] outline-none min-w-[220px]"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setNameDraft(name);
              setEditingName(true);
            }}
            className="font-display italic font-semibold text-display text-text-primary border border-transparent hover:border-border-soft hover:bg-surface-card rounded-sm px-sm py-[4px] cursor-text"
          >
            {name}
          </button>
        )}

        <div className="relative" ref={statusMenuRef}>
          <button
            type="button"
            onClick={() => setStatusMenuOpen((open) => !open)}
            className="inline-flex items-center gap-[2px] cursor-pointer"
          >
            <StatusPill family="scene" status={status} />
            <ChevronDownIcon className="text-text-secondary" />
          </button>
          {statusMenuOpen && (
            <div className="absolute left-0 top-[36px] z-30 w-[170px] bg-surface-card-solid border border-border-default rounded-md shadow-popover p-[6px] flex flex-col gap-[2px]">
              {STATUS_OPTIONS.filter((option) => option !== status).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => changeStatus(option)}
                  className="text-left text-ui font-medium px-sm py-[8px] rounded-sm text-text-button hover:bg-surface-panel cursor-pointer"
                >
                  Mark as {STATUS_LABEL[option]}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1" />

        <span className="text-micro text-text-secondary">
          {updateScene.isPending ? "Saving..." : lastSavedAt ? `Saved ${formatRelativeTime(lastSavedAt)}` : ""}
        </span>
      </div>

      <div
        className={`grid gap-xl px-xl py-xl ${sidebarOpen ? "grid-cols-[minmax(0,1fr)_320px]" : "grid-cols-[minmax(0,1fr)_auto]"}`}
      >
        <div className="flex flex-col gap-lg min-w-0">
          <PredecessorsPanel campaignId={campaignId} predecessors={scene.predecessors} />

          <MentionEditor
            label="Start"
            scope={campaignScope(campaignId)}
            value={scene.startJson}
            placeholder="How does this scene begin?"
            onSave={(doc) => handleFieldSave("startJson", doc)}
          />
          <MentionEditor
            label="Narration"
            scope={campaignScope(campaignId)}
            value={scene.narrationJson}
            placeholder="Write the scene. Type @ to mention a character, monster, or item…"
            onSave={(doc) => handleFieldSave("narrationJson", doc)}
          />
          <MentionEditor
            label="End"
            scope={campaignScope(campaignId)}
            value={scene.endJson}
            placeholder="How does this scene resolve?"
            onSave={(doc) => handleFieldSave("endJson", doc)}
          />
        </div>

        {sidebarOpen ? (
          <div className="flex flex-col gap-lg min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-label font-semibold uppercase tracking-wider text-text-label">
                Scene details
              </span>
              <IconButton label="Collapse sidebar" onClick={() => setSidebarOpen(false)}>
                <CloseIcon />
              </IconButton>
            </div>

            <MapCard
              campaignId={campaignId}
              sceneId={scene.id}
              mapImageUrl={scene.mapImageUrl}
              mapSourceUrl={scene.mapSourceUrl}
            />
            <EntitySection campaignId={campaignId} sceneId={scene.id} type="npc" label="Characters" entities={npcs} />
            <EntitySection
              campaignId={campaignId}
              sceneId={scene.id}
              type="monster"
              label="Monsters"
              entities={monsters}
            />
            <EntitySection campaignId={campaignId} sceneId={scene.id} type="item" label="Items" entities={items} />
          </div>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => setSidebarOpen(true)} className="self-start">
            Scene details
          </Button>
        )}
      </div>
    </div>
  );
}
