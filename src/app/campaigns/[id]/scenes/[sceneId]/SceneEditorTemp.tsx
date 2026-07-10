"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BackIcon, Button, ChevronDownIcon, StatusPill, Textarea } from "@/components/ui";
import { SceneStatus } from "@/hooks/useScenes";
import { useUpdateScene } from "@/hooks/useUpdateScene";
import { docToLines, isPlainTextDoc, linesToDoc } from "@/lib/tiptapPlainText";

const STATUS_LABEL: Record<SceneStatus, string> = {
  not_run: "Not run yet",
  running: "Running",
  completed: "Completed",
  skipped: "Skipped",
};
const STATUS_OPTIONS: SceneStatus[] = ["not_run", "running", "completed", "skipped"];

export interface SceneEditorTempProps {
  campaignId: string;
  campaignTitle: string;
  scene: {
    id: string;
    name: string;
    status: SceneStatus;
    startJson: unknown;
    narrationJson: unknown;
    endJson: unknown;
  };
}

interface FieldState {
  editable: boolean;
  text: string;
}

function initField(doc: unknown): FieldState {
  const editable = isPlainTextDoc(doc);
  return { editable, text: editable ? docToLines(doc).join("\n") : "" };
}

/*
  Temporary scene page: plain textareas with a manual save button, no
  autosave, no rich text, no mentions, no map card, no entity sections,
  no predecessors panel. Replaced by the real scene editor (Tiptap,
  mentions, sidebar) in a later build step per build-brief.md's build
  order.
*/
export function SceneEditorTemp({ campaignId, campaignTitle, scene }: SceneEditorTempProps) {
  const updateScene = useUpdateScene(campaignId);

  const [name, setName] = useState(scene.name);
  const [isEditingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(scene.name);

  const [status, setStatus] = useState(scene.status);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  const [start, setStart] = useState<FieldState>(() => initField(scene.startJson));
  const [narration, setNarration] = useState<FieldState>(() => initField(scene.narrationJson));
  const [end, setEnd] = useState<FieldState>(() => initField(scene.endJson));
  const [savedNotice, setSavedNotice] = useState(false);

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

  function handleSave() {
    const values: { startJson?: unknown; narrationJson?: unknown; endJson?: unknown } = {};
    if (start.editable) values.startJson = linesToDoc(start.text.split("\n"));
    if (narration.editable) values.narrationJson = linesToDoc(narration.text.split("\n"));
    if (end.editable) values.endJson = linesToDoc(end.text.split("\n"));

    updateScene.mutate(
      { id: scene.id, ...values },
      {
        onSuccess: () => {
          setSavedNotice(true);
          setTimeout(() => setSavedNotice(false), 2000);
        },
      },
    );
  }

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

        {savedNotice && <span className="text-micro text-text-secondary">Saved</span>}
        <Button variant="primary" onClick={handleSave} disabled={updateScene.isPending}>
          {updateScene.isPending ? "Saving..." : "Save"}
        </Button>
      </div>

      <div className="flex-1 flex flex-col gap-lg px-xl py-xl max-w-[820px] w-full mx-auto box-border">
        <SceneField label="Start" field={start} onChange={setStart} />
        <SceneField label="Narration" field={narration} onChange={setNarration} rows={10} />
        <SceneField label="End" field={end} onChange={setEnd} />
      </div>
    </div>
  );
}

function SceneField({
  label,
  field,
  onChange,
  rows = 5,
}: {
  label: string;
  field: FieldState;
  onChange: (field: FieldState) => void;
  rows?: number;
}) {
  if (!field.editable) {
    return (
      <div className="flex flex-col gap-sm">
        <div className="text-label font-semibold uppercase tracking-wider text-text-label">{label}</div>
        <div className="text-ui text-text-secondary bg-surface-card border border-border-soft rounded-lg px-lg py-base">
          This field has content this temporary editor cannot display safely. It is left
          untouched here; edit it once the full scene editor is available.
        </div>
      </div>
    );
  }

  return (
    <Textarea
      label={label}
      value={field.text}
      onChange={(event) => onChange({ ...field, text: event.target.value })}
      rows={rows}
    />
  );
}
