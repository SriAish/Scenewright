/*
  Server-side Tiptap-doc walker for the PDF exporter. Pure and
  Tiptap-free, following the pattern in src/lib/mentions/extract.ts
  (which only pulls mention ids for the reverse-lookup rebuild). This
  walker additionally preserves paragraph and text structure so prose
  can render faithfully in the PDF.

  Node types the shared editor (src/components/editor/MentionEditor.tsx)
  can actually produce: doc, paragraph, text, hardBreak (left enabled by
  StarterKit; the editor disables bold/italic/lists/headings/etc, so no
  mark types occur in practice), and mention (id + entityType attrs, no
  stored name). Any other type is treated as unknown: its own text
  content still renders (recursing into any nested content), and it is
  reported via onUnknownNode rather than silently dropped, per the PDF
  export step's requirement.
*/

interface DocNode {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: DocNode[];
}

export interface TextRun {
  kind: "text";
  text: string;
}

export interface MentionRun {
  kind: "mention";
  id: string;
}

export type DocRun = TextRun | MentionRun;

export type DocParagraph = DocRun[];

export interface RenderDocOptions {
  /** Called once per unknown node type encountered, for the caller to log/report. */
  onUnknownNode?: (nodeType: string) => void;
}

function collectInlineRuns(node: DocNode, runs: DocRun[], options: RenderDocOptions) {
  if (node.type === "text") {
    if (node.text) runs.push({ kind: "text", text: node.text });
    return;
  }
  if (node.type === "mention") {
    const id = node.attrs?.id;
    if (typeof id === "string") runs.push({ kind: "mention", id });
    return;
  }
  if (node.type === "hardBreak") {
    runs.push({ kind: "text", text: "\n" });
    return;
  }

  if (node.type) options.onUnknownNode?.(node.type);
  // Unknown inline node: still surface any text it or its children carry.
  if (node.text) runs.push({ kind: "text", text: node.text });
  for (const child of node.content ?? []) collectInlineRuns(child, runs, options);
}

function collectParagraphs(node: DocNode, paragraphs: DocParagraph[], options: RenderDocOptions) {
  if (node.type === "doc") {
    for (const child of node.content ?? []) collectParagraphs(child, paragraphs, options);
    return;
  }
  if (node.type === "paragraph") {
    const runs: DocRun[] = [];
    for (const child of node.content ?? []) collectInlineRuns(child, runs, options);
    paragraphs.push(runs);
    return;
  }

  // Unknown block node: report it, then flatten its own inline content
  // into one paragraph rather than dropping it.
  if (node.type) options.onUnknownNode?.(node.type);
  const runs: DocRun[] = [];
  for (const child of node.content ?? []) collectInlineRuns(child, runs, options);
  if (runs.length > 0) paragraphs.push(runs);
}

function isBlankParagraph(paragraph: DocParagraph): boolean {
  return paragraph.every((run) => run.kind === "text" && run.text.trim() === "");
}

/**
 * Converts a Tiptap doc into paragraphs of inline runs, with leading and
 * trailing blank paragraphs trimmed (the empty-editor default and
 * similar artifacts). Returns an empty array for a doc with no visible
 * content, which the caller treats as an absent field rather than
 * rendering a blank section.
 */
export function renderDocToParagraphs(doc: unknown, options: RenderDocOptions = {}): DocParagraph[] {
  if (typeof doc !== "object" || doc === null) return [];

  const paragraphs: DocParagraph[] = [];
  collectParagraphs(doc as DocNode, paragraphs, options);

  let start = 0;
  let end = paragraphs.length;
  while (start < end && isBlankParagraph(paragraphs[start])) start++;
  while (end > start && isBlankParagraph(paragraphs[end - 1])) end--;

  return paragraphs.slice(start, end);
}

export function isDocEmpty(doc: unknown): boolean {
  return renderDocToParagraphs(doc).length === 0;
}

export interface ResolvedTextRun {
  kind: "text";
  text: string;
}

export interface ResolvedMentionRun {
  kind: "mention";
  name: string;
  deleted: boolean;
}

export type ResolvedRun = ResolvedTextRun | ResolvedMentionRun;
export type ResolvedParagraph = ResolvedRun[];

export interface MentionLookupResult {
  name: string;
  deleted: boolean;
}

/**
 * Resolves each mention run's entity id to a display name, per the
 * mention node's own design: it stores id + type only, so names are
 * always looked up at render time (this is what lets a rename propagate
 * to every past export without touching saved docs). An id the lookup
 * can't find (entity outside this campaign, or any other inconsistency)
 * falls back to "Unknown" rather than throwing, since a broken mention
 * must not fail the whole export.
 */
export function resolveMentionRuns(
  paragraphs: DocParagraph[],
  lookup: (id: string) => MentionLookupResult | undefined,
): ResolvedParagraph[] {
  return paragraphs.map((paragraph) =>
    paragraph.map((run): ResolvedRun => {
      if (run.kind === "text") return run;
      const found = lookup(run.id);
      return { kind: "mention", name: found?.name ?? "Unknown", deleted: found?.deleted ?? false };
    }),
  );
}
