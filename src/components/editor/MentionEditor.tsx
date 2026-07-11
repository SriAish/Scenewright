"use client";

import { useEffect, useMemo, useRef } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useQueryClient } from "@tanstack/react-query";
import { entitiesQueryKey } from "@/hooks/useEntities";
import { buildMentionSuggestion, Mention } from "./mentionExtension";
import { MentionEditorProvider, useResolvedMentions } from "./MentionEditorContext";
import type { MentionEntityType } from "./types";

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

export interface MentionEditorProps {
  /** Tiptap document JSON. Also accepts the temporary textareas' plain doc-of-paragraphs shape unchanged. */
  value: unknown;
  /** Fires synchronously with the current doc JSON on every edit. */
  onChange?: (doc: unknown) => void;
  /** Fires with the current doc JSON `saveDebounceMs` after the last edit (autosave). */
  onSave?: (doc: unknown) => void;
  saveDebounceMs?: number;
  /** Campaign scope for autocomplete, create-from-mention, and chip name resolution. */
  campaignId: string;
  readOnly?: boolean;
  label?: string;
  placeholder?: string;
  className?: string;
}

/*
  Shared rich text editor with entity mentions, per features-and-
  decisions.md section 4. Minimal extension set rather than the full
  @tiptap/starter-kit surface: only Document/Paragraph/Text (the existing
  plain-text doc shape from the temporary textareas) plus undo/redo, drop
  cursor, and gap cursor for basic editing feel. No toolbar exists
  anywhere in the design (no bold/italic/lists/headings in any frame), so
  those StarterKit nodes/marks are configured off rather than installed
  as separate extension packages, which would add more dependencies than
  starter-kit itself for the same result.
*/
export function MentionEditor({
  value,
  onChange,
  onSave,
  saveDebounceMs = 1200,
  campaignId,
  readOnly = false,
  label,
  placeholder,
  className,
}: MentionEditorProps) {
  const queryClient = useQueryClient();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const extensions = useMemo(() => {
    const onEntityCreated = (entityType: MentionEntityType) =>
      queryClient.invalidateQueries({ queryKey: entitiesQueryKey(campaignId, entityType) });

    return [
      StarterKit.configure({
        blockquote: false,
        bold: false,
        bulletList: false,
        code: false,
        codeBlock: false,
        heading: false,
        horizontalRule: false,
        italic: false,
        link: false,
        listItem: false,
        listKeymap: false,
        orderedList: false,
        strike: false,
        underline: false,
      }),
      Mention.configure({
        suggestions: [
          buildMentionSuggestion({ char: "@", campaignId, onEntityCreated }),
          buildMentionSuggestion({ char: "[[", campaignId, onEntityCreated }),
        ],
      }),
    ];
    // extensions must be rebuilt if the campaign scope changes; queryClient is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  const editor = useEditor(
    {
      extensions,
      content: (value as object | null) ?? EMPTY_DOC,
      editable: !readOnly,
      immediatelyRender: false,
      onUpdate: ({ editor }) => {
        const doc = editor.getJSON();
        onChange?.(doc);
        if (!onSave) return;
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => onSave(doc), saveDebounceMs);
      },
    },
    [campaignId, readOnly],
  );

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    [],
  );

  const isEmpty = useEditorState({
    editor,
    selector: ({ editor }) => (editor ? editor.isEmpty : true),
  });

  const resolved = useResolvedMentions(editor, campaignId);

  return (
    <div className={`flex flex-col gap-sm ${className ?? ""}`}>
      {label && <span className="text-label font-semibold uppercase tracking-wider text-text-label">{label}</span>}
      <MentionEditorProvider value={{ campaignId, resolved }}>
        <div className="relative border border-border-soft bg-surface-card rounded-lg px-lg py-base text-content leading-[1.65] text-text-primary">
          {isEmpty && placeholder && (
            <div className="pointer-events-none absolute text-text-placeholder select-none">{placeholder}</div>
          )}
          <EditorContent editor={editor} />
        </div>
      </MentionEditorProvider>
    </div>
  );
}
