import { mergeAttributes, type Editor, type Range } from "@tiptap/core";
import TiptapMention, { type MentionOptions } from "@tiptap/extension-mention";
import { PluginKey } from "@tiptap/pm/state";
import type { SuggestionOptions, SuggestionProps } from "@tiptap/suggestion";
import { ReactNodeViewRenderer, ReactRenderer } from "@tiptap/react";
import { MentionDropdown, type MentionDropdownHandle } from "./MentionDropdown";
import { MentionNodeView } from "./MentionNodeView";
import type { MentionCommandPayload, MentionEntityType, MentionSearchResult } from "./types";

/*
  Mention node: stores entity id and type only, per features-and-
  decisions.md ("inserts a mention node (entity ID + type) rendered as an
  inline chip"). No name/label attribute — names resolve at render time
  from MentionEditor's resolved-entity map, which is how renames
  propagate without touching saved docs.
*/
export interface MentionAttrs {
  id: string | null;
  entityType: MentionEntityType | null;
}

export const Mention = TiptapMention.extend<MentionOptions<MentionSearchResult, MentionAttrs>>({
  addOptions() {
    return {
      ...(this.parent?.() as MentionOptions<MentionSearchResult, MentionAttrs>),
      // One Backspace fully removes the chip. The base extension's
      // default (false) instead replaces it with the bare trigger
      // character, which would leave a stray "@"/"[[" sitting in the
      // doc and could reopen the dropdown on the next keystroke.
      deleteTriggerWithBackspace: true,
    };
  },
  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-id"),
        renderHTML: (attributes) => (attributes.id ? { "data-id": attributes.id } : {}),
      },
      entityType: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-entity-type"),
        renderHTML: (attributes) => (attributes.entityType ? { "data-entity-type": attributes.entityType } : {}),
      },
    };
  },
  // Fallback for contexts the node view doesn't cover (renderText/copy);
  // the node view is what actually renders while the editor is mounted.
  renderText({ node }) {
    return `@${node.attrs.id ?? ""}`;
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes({ "data-type": "mention" }, HTMLAttributes), "@mention"];
  },
  addNodeView() {
    return ReactNodeViewRenderer(MentionNodeView);
  },
});

function insertMention(editor: Editor, range: Range, id: string, entityType: MentionEntityType) {
  // For the "create new entity" path, this runs after an await (the
  // create-entity fetch in buildMentionSuggestion's command below). If the
  // doc changed size in the meantime (the user kept typing while the
  // request was in flight), the range captured at trigger time can point
  // past the current document, and insertContentAt throws a RangeError,
  // crashing the editor and leaving the literal "@query" text stranded.
  // Clamp to the current doc bounds so a stale range degrades to
  // "insert at the nearest valid position" instead of crashing.
  const docSize = editor.state.doc.content.size;
  const safeRange =
    range.from <= docSize && range.to <= docSize
      ? range
      : { from: Math.min(editor.state.selection.from, docSize), to: Math.min(editor.state.selection.from, docSize) };

  const nodeAfter = editor.view.state.selection.$to.nodeAfter;
  const overrideSpace = nodeAfter?.text?.startsWith(" ");
  const finalRange = overrideSpace ? { ...safeRange, to: Math.min(safeRange.to + 1, docSize) } : safeRange;

  editor
    .chain()
    .focus()
    .insertContentAt(finalRange, [
      { type: "mention", attrs: { id, entityType } },
      { type: "text", text: " " },
    ])
    .run();
}

export interface BuildMentionSuggestionOptions {
  char: string;
  campaignId: string;
  onEntityCreated: (entityType: MentionEntityType) => void;
}

/**
 * One trigger's full Suggestion config. Called twice (for "@" and "[[")
 * with a fresh PluginKey each, per Tiptap's documented pattern for
 * multiple triggers sharing one node type (Mention.configure({
 * suggestions: [...] })).
 */
export function buildMentionSuggestion({
  char,
  campaignId,
  onEntityCreated,
}: BuildMentionSuggestionOptions): Omit<SuggestionOptions<MentionSearchResult, MentionAttrs>, "editor"> {
  // Built internally against MentionCommandPayload (a superset of what the
  // node's attrs alone can express: it also carries the "create a stub of
  // this type" case), then presented as Omit<SuggestionOptions<...,
  // MentionAttrs>, "editor"> at the boundary because that's what
  // Mention.configure({ suggestions }) expects. Tiptap's built-in Mention
  // assumes the suggestion's selected props ARE the node's attrs
  // (its default `command` spreads `props` straight into the inserted
  // node); this extension always supplies its own `command` instead, so
  // that assumption never actually applies at runtime.
  const config: Omit<SuggestionOptions<MentionSearchResult, MentionCommandPayload>, "editor"> = {
    char,
    pluginKey: new PluginKey(`mention-${char}`),
    // Entity names in this app are routinely multi-word (Grimshade Ooze,
    // Brass Sigil Key); a single space would otherwise close the
    // suggestion mid-name, breaking both prefix search and create-new
    // naming for anything but a one-word entity.
    allowSpaces: true,
    minQueryLength: 1,
    debounce: 200,
    items: async ({ query, signal }) => {
      const response = await fetch(
        `/api/campaigns/${campaignId}/entities/search?q=${encodeURIComponent(query)}`,
        { signal },
      );
      if (!response.ok) return [];
      return response.json();
    },
    command: async ({ editor, range, props }) => {
      if (props.kind === "existing") {
        insertMention(editor, range, props.id, props.entityType);
        return;
      }

      const response = await fetch(`/api/campaigns/${campaignId}/entities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: props.entityType, name: props.name }),
      });
      if (!response.ok) return;
      const created: { id: string } = await response.json();
      onEntityCreated(props.entityType);
      insertMention(editor, range, created.id, props.entityType);
    },
    render: () => {
      let component: ReactRenderer<MentionDropdownHandle, SuggestionProps<MentionSearchResult, MentionCommandPayload>> | undefined;
      let unmount: (() => void) | undefined;

      return {
        onStart: (props) => {
          component = new ReactRenderer(MentionDropdown, { props, editor: props.editor });
          if (!props.clientRect) return;
          unmount = props.mount(component.element as HTMLElement);
        },
        onUpdate: (props) => {
          component?.updateProps(props);
        },
        onKeyDown: (props) => component?.ref?.onKeyDown(props) ?? false,
        onExit: () => {
          unmount?.();
          component?.destroy();
        },
      };
    },
  };

  return config as unknown as Omit<SuggestionOptions<MentionSearchResult, MentionAttrs>, "editor">;
}
