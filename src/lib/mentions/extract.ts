/*
  Pure Tiptap-doc mention-id extraction, split out from ./index.ts so the
  editor (client bundle) can import it without pulling in the server-only
  DB client that index.ts (the rebuild service) depends on.
*/

interface DocNode {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: DocNode[];
}

function walk(node: unknown, ids: Set<string>) {
  if (typeof node !== "object" || node === null) return;
  const current = node as DocNode;
  if (current.type === "mention" && typeof current.attrs?.id === "string") {
    ids.add(current.attrs.id);
  }
  if (Array.isArray(current.content)) {
    for (const child of current.content) walk(child, ids);
  }
}

/** Extracts the set of unique entity ids mentioned across one or more Tiptap docs. */
export function extractMentionedEntityIds(docs: unknown[]): string[] {
  const ids = new Set<string>();
  for (const doc of docs) walk(doc, ids);
  return Array.from(ids);
}
